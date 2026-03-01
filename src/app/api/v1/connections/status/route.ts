import { apiError, apiSuccess } from "@/lib/api-response";
import { logApiError, logApiRequest, logApiResponse } from "@/lib/api-debug";
import { getBearerToken } from "@/lib/auth";
import {
  checkConnectionStatus,
  checkConnectionStatusByToken,
} from "@/lib/gateway-store";

export async function GET(request: Request) {
  try {
    const token = getBearerToken(request.headers.get("Authorization"));
    const url = new URL(request.url);
    const connectionId = url.searchParams.get("connectionId")?.trim();
    logApiRequest("/api/v1/connections/status", {
      method: "GET",
      authProvided: Boolean(token),
      query: connectionId ? { connectionId } : {},
    });

    if (token) {
      const status = await checkConnectionStatusByToken(token);

      if (!status) {
        logApiResponse("/api/v1/connections/status", {
          status: 401,
          message: "Invalid or expired connection token",
        });
        return apiError("Invalid or expired connection token", 401);
      }

      if (connectionId && status.connection.id !== connectionId) {
        logApiResponse("/api/v1/connections/status", {
          status: 403,
          connectionId,
          message: "connectionId does not match Authorization token",
        });
        return apiError("connectionId does not match Authorization token", 403);
      }

      logApiResponse("/api/v1/connections/status", {
        status: 200,
        connectionId: status.connection.id,
        socketStatus: status.socketStatus,
        isReachable: status.isReachable,
      });

      return apiSuccess({
        ...status,
        mobileNumber: status.connection.connectedMobile,
      });
    }

    if (!connectionId) {
      logApiResponse("/api/v1/connections/status", {
        status: 400,
        message: "Provide Authorization Bearer token or connectionId",
      });
      return apiError(
        "Provide Authorization Bearer token or connectionId",
        400,
      );
    }

    const status = await checkConnectionStatus(connectionId);

    if (!status) {
      logApiResponse("/api/v1/connections/status", {
        status: 404,
        connectionId,
        message: "Connection not found",
      });
      return apiError("Connection not found", 404);
    }

    logApiResponse("/api/v1/connections/status", {
      status: 200,
      connectionId: status.connection.id,
      socketStatus: status.socketStatus,
      isReachable: status.isReachable,
    });
    return apiSuccess({
      ...status,
      mobileNumber: status.connection.connectedMobile,
    });
  } catch (error) {
    logApiError("/api/v1/connections/status", error);
    return apiError("Failed to check connection status", 500);
  }
}
