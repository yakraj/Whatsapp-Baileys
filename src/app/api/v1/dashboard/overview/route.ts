import { apiSuccess } from "@/lib/api-response";
import { logApiRequest, logApiResponse } from "@/lib/api-debug";
import { getDashboardOverview } from "@/lib/gateway-store";

export async function GET() {
  logApiRequest("/api/v1/dashboard/overview", {
    method: "GET",
  });
  const overview = await getDashboardOverview();
  logApiResponse("/api/v1/dashboard/overview", {
    status: 200,
    totalConnections: overview.overview.totalConnections,
    connectedNow: overview.overview.connectedNow,
    totalMessagesSent: overview.overview.totalMessagesSent,
    recentMessages: overview.recentMessages.length,
  });
  return apiSuccess(overview);
}
