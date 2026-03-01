import { apiError, apiSuccess } from "@/lib/api-response";
import { logApiError, logApiRequest, logApiResponse } from "@/lib/api-debug";
import { getBearerToken } from "@/lib/auth";
import {
  getConnectionById,
  getConnectionByToken,
  queueOutgoingMessage,
} from "@/lib/gateway-store";
import { sendMessageSchema } from "@/lib/validation";

interface ParsedSendPayload {
  mobileNumber: string;
  message: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  connectionId?: string;
}

async function parsePayload(
  request: Request,
): Promise<ParsedSendPayload | null> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    const payload: ParsedSendPayload = {
      mobileNumber: String(formData.get("mobileNumber") ?? ""),
      message: String(formData.get("message") ?? ""),
      fileUrl: String(formData.get("fileUrl") ?? ""),
      connectionId: String(formData.get("connectionId") ?? ""),
    };

    if (file instanceof File) {
      payload.fileName = file.name;
      payload.fileType = file.type;
      payload.fileSize = file.size;

      // Convert file to base64 data URL
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      payload.fileUrl = `data:${file.type};base64,${base64}`;
    }

    return payload;
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as ParsedSendPayload;
    return body;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const payload = await parsePayload(request);
    const token = getBearerToken(request.headers.get("Authorization"));
    logApiRequest("/api/v1/messages/send", {
      method: "POST",
      authProvided: Boolean(token),
      contentType: request.headers.get("Content-Type"),
      body: payload ?? undefined,
    });

    if (!payload) {
      logApiResponse("/api/v1/messages/send", {
        status: 415,
        message: "Unsupported request content type",
      });
      return apiError("Unsupported request content type", 415);
    }

    const validation = sendMessageSchema.safeParse(payload);

    if (!validation.success) {
      logApiResponse("/api/v1/messages/send", {
        status: 400,
        message: "Invalid message payload",
      });
      return apiError(
        "Invalid message payload",
        400,
        validation.error.flatten(),
      );
    }

    const byToken = token ? await getConnectionByToken(token) : undefined;
    const byId =
      payload.connectionId && payload.connectionId.trim()
        ? await getConnectionById(payload.connectionId.trim())
        : undefined;
    const connection = byToken ?? byId;

    if (!connection) {
      logApiResponse("/api/v1/messages/send", {
        status: 404,
        message: "Connection not found",
      });
      return apiError(
        "Connection not found. Provide a valid Bearer token or connectionId.",
        404,
      );
    }

    if (byToken && byId && byToken.id !== byId.id) {
      logApiResponse("/api/v1/messages/send", {
        status: 403,
        message: "connectionId does not match Authorization token",
      });
      return apiError("connectionId does not match Authorization token", 403);
    }

    if (connection.status !== "connected") {
      logApiResponse("/api/v1/messages/send", {
        status: 403,
        connectionId: connection.id,
        connectionStatus: connection.status,
        message: "Connection is pending QR approval",
      });
      return apiError(
        "Connection is pending QR approval. Complete login before sending messages.",
        403,
      );
    }

    const message = await queueOutgoingMessage(connection.id, {
      mobileNumber: validation.data.mobileNumber,
      message: validation.data.message,
      attachment:
        validation.data.fileName || validation.data.fileUrl
          ? {
              name: validation.data.fileName ?? "external-attachment",
              type: validation.data.fileType,
              size: validation.data.fileSize,
              url: validation.data.fileUrl || undefined,
            }
          : undefined,
    });

    logApiResponse("/api/v1/messages/send", {
      status: message.status === "failed" ? 502 : 201,
      messageId: message.id,
      connectionId: message.connectionId,
      deliveryStatus: message.status,
    });

    if (message.status === "failed") {
      return apiError(
        "Message delivery failed — WhatsApp socket is not ready. Check connection status.",
        502,
        { messageId: message.id },
      );
    }

    return apiSuccess(message, 201);
  } catch (error) {
    logApiError("/api/v1/messages/send", error);
    return apiError("Failed to queue message", 500);
  }
}
