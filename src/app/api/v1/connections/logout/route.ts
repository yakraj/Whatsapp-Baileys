import { apiError, apiSuccess } from "@/lib/api-response";
import { logApiError, logApiRequest, logApiResponse } from "@/lib/api-debug";
import { getBearerToken } from "@/lib/auth";
import {
  getConnectionById,
  logoutConnection,
  logoutConnectionByToken,
} from "@/lib/gateway-store";

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("Authorization"));
    const body = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
    };
    logApiRequest("/api/v1/connections/logout", {
      method: "POST",
      authProvided: Boolean(token),
      body,
    });

    if (token) {
      const loggedOut = await logoutConnectionByToken(token);

      if (!loggedOut) {
        logApiResponse("/api/v1/connections/logout", {
          status: 401,
          message: "Invalid or expired connection token",
        });
        return apiError("Invalid or expired connection token", 401);
      }

      logApiResponse("/api/v1/connections/logout", {
        status: 200,
        connectionId: loggedOut.id,
        connectionStatus: loggedOut.status,
      });
      return apiSuccess(loggedOut);
    }

    const connectionId = body.connectionId?.trim();

    if (!connectionId) {
      logApiResponse("/api/v1/connections/logout", {
        status: 400,
        message: "Provide Authorization Bearer token or connectionId",
      });
      return apiError("Provide Authorization Bearer token or connectionId", 400);
    }

    const connection = await getConnectionById(connectionId);

    if (!connection) {
      logApiResponse("/api/v1/connections/logout", {
        status: 404,
        connectionId,
        message: "Connection not found",
      });
      return apiError("Connection not found", 404);
    }

    const loggedOut = await logoutConnection(connection.id);

    if (!loggedOut) {
      logApiResponse("/api/v1/connections/logout", {
        status: 500,
        connectionId: connection.id,
        message: "Failed to logout connection",
      });
      return apiError("Failed to logout connection", 500);
    }

    logApiResponse("/api/v1/connections/logout", {
      status: 200,
      connectionId: loggedOut.id,
      connectionStatus: loggedOut.status,
    });
    return apiSuccess(loggedOut);
  } catch (error) {
    logApiError("/api/v1/connections/logout", error);
    return apiError("Failed to logout connection", 500);
  }
}
