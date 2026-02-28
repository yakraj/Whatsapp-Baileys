import { apiSuccess } from "@/lib/api-response";
import { getBearerToken } from "@/lib/auth";
import { getConnectionByToken, listConnections } from "@/lib/gateway-store";

export async function GET(request: Request) {
  const token = getBearerToken(request.headers.get("Authorization"));

  if (!token) {
    return apiSuccess(listConnections());
  }

  const connection = getConnectionByToken(token);

  if (!connection) {
    return apiSuccess([]);
  }

  return apiSuccess([connection]);
}
