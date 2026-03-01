import { apiSuccess } from "@/lib/api-response";
import { logApiRequest, logApiResponse } from "@/lib/api-debug";
import { getBearerToken } from "@/lib/auth";
import { getConnectionByToken, listConnections } from "@/lib/gateway-store";

export async function GET(request: Request) {
  const token = getBearerToken(request.headers.get("Authorization"));
  logApiRequest("/api/v1/connections", {
    method: "GET",
    authProvided: Boolean(token),
  });

  if (!token) {
    const connections = await listConnections();
    logApiResponse("/api/v1/connections", {
      status: 200,
      count: connections.length,
    });
    return apiSuccess(connections);
  }

  const connection = await getConnectionByToken(token);

  if (!connection) {
    logApiResponse("/api/v1/connections", {
      status: 200,
      count: 0,
    });
    return apiSuccess([]);
  }

  logApiResponse("/api/v1/connections", {
    status: 200,
    count: 1,
    connectionId: connection.id,
  });
  return apiSuccess([connection]);
}
