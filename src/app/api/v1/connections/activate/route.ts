import { apiError, apiSuccess } from "@/lib/api-response";
import { getBearerToken } from "@/lib/auth";
import {
  activateConnection,
  activateConnectionByToken,
  getConnectionById,
} from "@/lib/gateway-store";

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("Authorization"));
    const body = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
    };

    if (token) {
      const activated = activateConnectionByToken(token);

      if (!activated) {
        return apiError("Invalid or expired connection token", 401);
      }

      return apiSuccess(activated);
    }

    const connectionId = body.connectionId?.trim();

    if (!connectionId) {
      return apiError("Provide Authorization Bearer token or connectionId", 400);
    }

    const connection = getConnectionById(connectionId);

    if (!connection) {
      return apiError("Connection not found", 404);
    }

    const activated = activateConnection(connection.id);

    if (!activated) {
      return apiError("Failed to activate connection", 500);
    }

    return apiSuccess(activated);
  } catch {
    return apiError("Failed to activate connection", 500);
  }
}
