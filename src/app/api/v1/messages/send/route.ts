import { apiError, apiSuccess } from "@/lib/api-response";
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

async function parsePayload(request: Request): Promise<ParsedSendPayload | null> {
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

    if (!payload) {
      return apiError("Unsupported request content type", 415);
    }

    const validation = sendMessageSchema.safeParse(payload);

    if (!validation.success) {
      return apiError("Invalid message payload", 400, validation.error.flatten());
    }

    const token = getBearerToken(request.headers.get("Authorization"));
    const byToken = token ? getConnectionByToken(token) : undefined;
    const byId =
      payload.connectionId && payload.connectionId.trim()
        ? getConnectionById(payload.connectionId.trim())
        : undefined;
    const connection = byToken ?? byId;

    if (!connection) {
      return apiError(
        "Connection not found. Provide a valid Bearer token or connectionId.",
        404
      );
    }

    if (byToken && byId && byToken.id !== byId.id) {
      return apiError("connectionId does not match Authorization token", 403);
    }

    if (connection.status !== "connected") {
      return apiError(
        "Connection is pending QR approval. Complete login before sending messages.",
        403
      );
    }

    const message = queueOutgoingMessage(connection.id, {
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

    return apiSuccess(message, 201);
  } catch {
    return apiError("Failed to queue message", 500);
  }
}
