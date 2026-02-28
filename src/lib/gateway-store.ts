import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { signConnectionToken, verifyConnectionToken } from "@/lib/connection-token";
import type {
  ConnectionRequestResult,
  CreateConnectionInput,
  DashboardOverviewResponse,
  GatewayConnection,
  MessageLog,
  SendMessageInput,
} from "@/types/gateway";

interface GatewayStoreState {
  connectionsById: Map<string, GatewayConnection>;
  connectionIdByCustomerId: Map<string, string>;
  messages: MessageLog[];
}

declare global {
  var __gatewayStoreState: GatewayStoreState | undefined;
}

function createStoreState(): GatewayStoreState {
  return {
    connectionsById: new Map<string, GatewayConnection>(),
    connectionIdByCustomerId: new Map<string, string>(),
    messages: [],
  };
}

function getStoreState(): GatewayStoreState {
  if (!global.__gatewayStoreState) {
    global.__gatewayStoreState = createStoreState();
  }

  return global.__gatewayStoreState;
}

function sanitizeOptionalUrl(url?: string): string | undefined {
  if (!url || !url.trim()) {
    return undefined;
  }

  return url.trim();
}

function upsertConnection(input: CreateConnectionInput): GatewayConnection {
  const store = getStoreState();
  const now = new Date().toISOString();
  const existingConnectionId = store.connectionIdByCustomerId.get(input.customerId);

  if (existingConnectionId) {
    const existingConnection = store.connectionsById.get(existingConnectionId);

    if (existingConnection) {
      const updatedConnection: GatewayConnection = {
        ...existingConnection,
        customerId: input.customerId,
        customerName: input.customerName,
        websiteUrl: sanitizeOptionalUrl(input.websiteUrl),
        status: "pending_qr",
        lastActiveAt: now,
      };

      store.connectionsById.set(existingConnection.id, updatedConnection);

      return updatedConnection;
    }
  }

  const connection: GatewayConnection = {
    id: randomUUID(),
    customerId: input.customerId,
    customerName: input.customerName,
    websiteUrl: sanitizeOptionalUrl(input.websiteUrl),
    status: "pending_qr",
    sentCount: 0,
    createdAt: now,
    lastActiveAt: now,
  };

  store.connectionsById.set(connection.id, connection);
  store.connectionIdByCustomerId.set(connection.customerId, connection.id);

  return connection;
}

export async function createConnectionRequest(
  input: CreateConnectionInput
): Promise<ConnectionRequestResult> {
  const connection = upsertConnection(input);
  const auth = signConnectionToken({
    connectionId: connection.id,
    customerId: connection.customerId,
    customerName: connection.customerName,
    tokenType: "gateway_connection",
  });

  const qrPayload = `baileys-gateway://login?token=${encodeURIComponent(auth.token)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 320,
  });

  return {
    connection,
    auth: {
      connectionToken: auth.token,
      qrCodeDataUrl,
      expiresAt: auth.expiresAt,
    },
  };
}

export function listConnections(): GatewayConnection[] {
  const store = getStoreState();
  return Array.from(store.connectionsById.values()).sort((left, right) =>
    right.lastActiveAt.localeCompare(left.lastActiveAt)
  );
}

export function getConnectionById(connectionId: string): GatewayConnection | undefined {
  return getStoreState().connectionsById.get(connectionId);
}

export function getConnectionByToken(token: string): GatewayConnection | undefined {
  const store = getStoreState();
  const claims = verifyConnectionToken(token);

  if (!claims) {
    return undefined;
  }

  const connection = store.connectionsById.get(claims.connectionId);

  if (!connection || connection.customerId !== claims.customerId) {
    return undefined;
  }

  return connection;
}

export function activateConnection(connectionId: string): GatewayConnection | undefined {
  const store = getStoreState();
  const connection = store.connectionsById.get(connectionId);

  if (!connection) {
    return undefined;
  }

  const updatedConnection: GatewayConnection = {
    ...connection,
    status: "connected",
    lastActiveAt: new Date().toISOString(),
  };

  store.connectionsById.set(connection.id, updatedConnection);
  return updatedConnection;
}

export function activateConnectionByToken(token: string): GatewayConnection | undefined {
  const connection = getConnectionByToken(token);

  if (!connection) {
    return undefined;
  }

  return activateConnection(connection.id);
}

function updateConnectionSentCount(connection: GatewayConnection): GatewayConnection {
  const store = getStoreState();
  const updatedConnection: GatewayConnection = {
    ...connection,
    sentCount: connection.sentCount + 1,
    lastActiveAt: new Date().toISOString(),
  };

  store.connectionsById.set(connection.id, updatedConnection);
  return updatedConnection;
}

export function queueOutgoingMessage(
  connectionId: string,
  input: SendMessageInput
): MessageLog {
  const store = getStoreState();
  const connection = store.connectionsById.get(connectionId);

  if (!connection) {
    throw new Error("Connection not found");
  }

  if (connection.status !== "connected") {
    throw new Error("Connection is not active");
  }

  updateConnectionSentCount(connection);

  const status: MessageLog["status"] = Math.random() > 0.05 ? "sent" : "failed";
  const messageLog: MessageLog = {
    id: randomUUID(),
    connectionId,
    mobileNumber: input.mobileNumber,
    message: input.message,
    attachment: input.attachment,
    status,
    createdAt: new Date().toISOString(),
  };

  store.messages.unshift(messageLog);
  store.messages = store.messages.slice(0, 200);

  return messageLog;
}

function getMessagesTodayCount(messages: MessageLog[]): number {
  const today = new Date();

  return messages.filter((message) => {
    const date = new Date(message.createdAt);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;
}

export function getDashboardOverview(): DashboardOverviewResponse {
  const store = getStoreState();
  const connections = listConnections();
  const messages = store.messages;
  const failedMessages = messages.filter((message) => message.status === "failed")
    .length;
  const totalMessagesSent = messages.filter((message) => message.status === "sent")
    .length;
  const recentMessages = messages.slice(0, 20);

  return {
    overview: {
      totalConnections: connections.length,
      connectedNow: connections.filter((connection) => connection.status === "connected")
        .length,
      totalMessagesSent,
      messagesToday: getMessagesTodayCount(messages),
      failedMessages,
    },
    connections,
    recentMessages,
  };
}
