import { apiSuccess } from "@/lib/api-response";
import { getDashboardOverview } from "@/lib/gateway-store";

export async function GET() {
  return apiSuccess(getDashboardOverview());
}
