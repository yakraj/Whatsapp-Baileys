import type {
  GatewayConnection as GatewayConnectionRecord,
  MessageLog as MessageLogRecord,
} from "@prisma/client";
import {
  signConnectionToken,
  verifyConnectionToken,
} from "@/lib/connection-token";
import { prisma } from "@/lib/prisma";
import { waManager } from "@/lib/whatsapp-manager";
import type {
  ConnectionStatusCheckResult,
  ConnectionRequestResult,
  CreateConnectionInput,
  DashboardOverviewResponse,
  GatewayConnection,
  MessageLog,
  SendMessageInput,
} from "@/types/gateway";

const MAX_STORED_MESSAGES = 200;
const SOCKET_STALE_THRESHOLD_MS = 5 * 60 * 1000;

function sanitizeOptionalUrl(url?: string): string | undefined {
  if (!url || !url.trim()) {
    return undefined;
  }

  return url.trim();
}

function mapConnection(connection: GatewayConnectionRecord): GatewayConnection {
  return {
    id: connection.id,
    customerId: connection.customerId,
    customerName: connection.customerName,
    websiteUrl: connection.websiteUrl ?? undefined,
    status: connection.status,
    connectedMobile: connection.connectedMobile ?? undefined,
    sentCount: connection.sentCount,
    createdAt: connection.createdAt.toISOString(),
    lastActiveAt: connection.lastActiveAt.toISOString(),
  };
}

function mapMessage(message: MessageLogRecord): MessageLog {
  const hasAttachment =
    Boolean(message.attachmentName) ||
    Boolean(message.attachmentType) ||
    Boolean(message.attachmentUrl) ||
    typeof message.attachmentSize === "number";

  return {
    id: message.id,
    connectionId: message.connectionId,
    mobileNumber: message.mobileNumber,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    attachment: hasAttachment
      ? {
          name: message.attachmentName ?? "external-attachment",
          type: message.attachmentType ?? undefined,
          size: message.attachmentSize ?? undefined,
          url: message.attachmentUrl ?? undefined,
        }
      : undefined,
  };
}

async function trimStoredMessages(): Promise<void> {
  const oldMessages = await prisma.messageLog.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
    skip: MAX_STORED_MESSAGES,
  });

  if (!oldMessages.length) {
    return;
  }

  await prisma.messageLog.deleteMany({
    where: {
      id: {
        in: oldMessages.map((message) => message.id),
      },
    },
  });
}

async function upsertConnection(
  input: CreateConnectionInput,
  connectionToken?: string,
): Promise<GatewayConnection> {
  const now = new Date();
  const websiteUrl = sanitizeOptionalUrl(input.websiteUrl);
  const existingConnection = await prisma.gatewayConnection.findUnique({
    where: { customerId: input.customerId },
  });

  if (existingConnection) {
    const updatedConnection = await prisma.gatewayConnection.update({
      where: { id: existingConnection.id },
      data: {
        customerName: input.customerName,
        websiteUrl,
        connectionToken: connectionToken ?? existingConnection.connectionToken,
        status: "pending_qr",
        lastActiveAt: now,
      },
    });

    return mapConnection(updatedConnection);
  }

  const connection = await prisma.gatewayConnection.create({
    data: {
      customerId: input.customerId,
      customerName: input.customerName,
      websiteUrl,
      connectionToken: connectionToken ?? null,
      status: "pending_qr",
      lastActiveAt: now,
    },
  });

  return mapConnection(connection);
}

export async function createConnectionRequest(
  input: CreateConnectionInput,
): Promise<ConnectionRequestResult> {
  // Build the JWT first so we can persist it alongside the connection row
  const tempId =
    (
      await prisma.gatewayConnection.findUnique({
        where: { customerId: input.customerId },
        select: { id: true },
      })
    )?.id ?? "pending";

  // Upsert the DB row (without token first to get the real id)
  const connection = await upsertConnection(input);

  const auth = signConnectionToken({
    connectionId: connection.id,
    customerId: connection.customerId,
    customerName: connection.customerName,
    tokenType: "gateway_connection",
  });

  // Persist the JWT in the DB so it survives reboots
  await prisma.gatewayConnection.update({
    where: { id: connection.id },
    data: { connectionToken: auth.token },
  });

  void tempId; // suppress unused-var warning

    // Start a real Baileys socket and wait for the WhatsApp QR.
    // passing true deletes any stale auth state synchronously inside the manager
    // perfectly avoiding race conditions with old socket instances saving state.
    const qrCodeDataUrl = await waManager.startSession(connection.id, true);

    if (qrCodeDataUrl === undefined) {
      throw new Error(`Failed to initialize session for connection ${connection.id} (possible immediate logout/timeout)`);
    }

    if (!qrCodeDataUrl) {
      // Session restored silently (stored credentials still valid)
      return {
        connection: { ...connection, status: "connected" },
        auth: {
          connectionToken: auth.token,
          qrCodeDataUrl: "",
          expiresAt: auth.expiresAt,
        },
      };
    }

  return {
    connection,
    auth: {
      connectionToken: auth.token,
      qrCodeDataUrl,
      expiresAt: auth.expiresAt,
    },
  };
}

export async function listConnections(): Promise<GatewayConnection[]> {
  const connections = await prisma.gatewayConnection.findMany({
    orderBy: { lastActiveAt: "desc" },
  });

  return connections.map(mapConnection);
}

export async function getConnectionById(
  connectionId: string,
): Promise<GatewayConnection | undefined> {
  const connection = await prisma.gatewayConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return undefined;
  }

  return mapConnection(connection);
}

export async function getConnectionByToken(
  token: string,
): Promise<GatewayConnection | undefined> {
  const claims = verifyConnectionToken(token);

  if (!claims) {
    return undefined;
  }

  const connection = await prisma.gatewayConnection.findUnique({
    where: { id: claims.connectionId },
  });

  if (!connection || connection.customerId !== claims.customerId) {
    return undefined;
  }

  return mapConnection(connection);
}

export async function activateConnection(
  connectionId: string,
): Promise<GatewayConnection | undefined> {
  const connection = await prisma.gatewayConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return undefined;
  }

  const updatedConnection = await prisma.gatewayConnection.update({
    where: { id: connection.id },
    data: {
      status: "connected",
      lastActiveAt: new Date(),
    },
  });

  return mapConnection(updatedConnection);
}

export async function activateConnectionByToken(
  token: string,
): Promise<GatewayConnection | undefined> {
  const connection = await getConnectionByToken(token);

  if (!connection) {
    return undefined;
  }

  return activateConnection(connection.id);
}

function computeSocketStatus(
  connection: GatewayConnection,
  connectionId: string,
): {
  socketStatus: ConnectionStatusCheckResult["socketStatus"];
  isReachable: boolean;
} {
  if (connection.status !== "connected") {
    return {
      socketStatus: "disconnected",
      isReachable: false,
    };
  }

  // Primary check: is the Baileys socket actually open right now?
  const isOpen = waManager.isSocketOpen(connectionId);
  if (!isOpen) {
    return {
      socketStatus: "stale",
      isReachable: false,
    };
  }

  // Secondary check: stale by inactivity time
  const lastActiveAtMs = new Date(connection.lastActiveAt).getTime();
  const isStale = Date.now() - lastActiveAtMs > SOCKET_STALE_THRESHOLD_MS;

  if (isStale) {
    return {
      socketStatus: "stale",
      isReachable: false,
    };
  }

  return {
    socketStatus: "connected",
    isReachable: true,
  };
}

export async function checkConnectionStatus(
  connectionId: string,
): Promise<ConnectionStatusCheckResult | undefined> {
  const connection = await getConnectionById(connectionId);

  if (!connection) {
    return undefined;
  }

  const { socketStatus, isReachable } = computeSocketStatus(connection, connectionId);

  if (socketStatus === "stale" && connection.status !== "stale") {
    const staleConnection = await prisma.gatewayConnection.update({
      where: { id: connection.id },
      data: { status: "stale", connectedMobile: null },
    });

    return {
      connection: mapConnection(staleConnection),
      socketStatus,
      isReachable,
      checkedAt: new Date().toISOString(),
    };
  }

  return {
    connection,
    socketStatus,
    isReachable,
    checkedAt: new Date().toISOString(),
  };
}

export async function checkConnectionStatusByToken(
  token: string,
): Promise<ConnectionStatusCheckResult | undefined> {
  const connection = await getConnectionByToken(token);

  if (!connection) {
    return undefined;
  }

  return checkConnectionStatus(connection.id);
}

export async function logoutConnection(
  connectionId: string,
): Promise<GatewayConnection | undefined> {
  const connection = await prisma.gatewayConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    return undefined;
  }

  // Stop active Baileys socket and purge stored credentials
  await waManager.stopSession(connectionId);

  const updatedConnection = await prisma.gatewayConnection.update({
    where: { id: connection.id },
    data: {
      status: "stale",
      lastActiveAt: new Date(),
      connectedMobile: null,
    },
  });

  return mapConnection(updatedConnection);
}

export async function logoutConnectionByToken(
  token: string,
): Promise<GatewayConnection | undefined> {
  const connection = await getConnectionByToken(token);

  if (!connection) {
    return undefined;
  }

  return logoutConnection(connection.id);
}

export async function queueOutgoingMessage(
  connectionId: string,
  input: SendMessageInput,
): Promise<MessageLog> {
  // 1. Validate the connection is marked connected in the DB
  const connection = await prisma.gatewayConnection.findUnique({
    where: { id: connectionId },
  });

  if (!connection) {
    throw new Error("Connection not found");
  }

  if (connection.status !== "connected") {
    throw new Error("Connection is not active");
  }

  // 2. Attempt actual delivery via Baileys socket
  let status: MessageLog["status"];
  try {
    const attachment = input.attachment?.url ? {
      name: input.attachment.name,
      type: input.attachment.type, 
      url: input.attachment.url,
      caption: input.message || undefined
    } : undefined;

    await waManager.sendTextMessage(
      connectionId,
      input.mobileNumber,
      input.message,
      attachment ? { attachment } : undefined
    );
    status = "sent";

    // Only increment sentCount after confirmed delivery
    await prisma.gatewayConnection.update({
      where: { id: connectionId },
      data: {
        sentCount: { increment: 1 },
        lastActiveAt: new Date(),
      },
    });
  } catch (sendError) {
    console.error(
      `[WA] sendTextMessage failed for ${connectionId}:`,
      sendError,
    );
    status = "failed";
  }

  // 3. Log the result
  const messageLog = await prisma.messageLog.create({
    data: {
      connectionId,
      mobileNumber: input.mobileNumber,
      message: input.message,
      status,
      attachmentName: input.attachment?.name,
      attachmentType: input.attachment?.type,
      attachmentSize: input.attachment?.size,
      attachmentUrl: input.attachment?.url,
    },
  });

  await trimStoredMessages();

  return mapMessage(messageLog);
}

export async function getDashboardOverview(): Promise<DashboardOverviewResponse> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalConnections,
    connectedNow,
    totalMessagesSent,
    messagesToday,
    failedMessages,
    connections,
    recentMessages,
  ] = await prisma.$transaction([
    prisma.gatewayConnection.count(),
    prisma.gatewayConnection.count({
      where: { status: "connected" },
    }),
    prisma.messageLog.count({
      where: { status: "sent" },
    }),
    prisma.messageLog.count({
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.messageLog.count({
      where: { status: "failed" },
    }),
    prisma.gatewayConnection.findMany({
      orderBy: { lastActiveAt: "desc" },
    }),
    prisma.messageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    overview: {
      totalConnections,
      connectedNow,
      totalMessagesSent,
      messagesToday,
      failedMessages,
    },
    connections: connections.map(mapConnection),
    recentMessages: recentMessages.map(mapMessage),
  };
}
