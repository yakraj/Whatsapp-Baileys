import { apiError, apiSuccess } from "@/lib/api-response";
import { logApiError, logApiRequest, logApiResponse } from "@/lib/api-debug";
import { createConnectionRequest } from "@/lib/gateway-store";
import { requestConnectionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    logApiRequest("/api/v1/connections/request", {
      method: "POST",
      body,
    });
    const result = requestConnectionSchema.safeParse(body);

    if (!result.success) {
      logApiResponse("/api/v1/connections/request", {
        status: 400,
        message: "Invalid connection payload",
      });
      return apiError("Invalid connection payload", 400, result.error.flatten());
    }

    const connectionRequest = await createConnectionRequest({
      customerId: result.data.customerId,
      customerName: result.data.customerName,
      websiteUrl: result.data.websiteUrl || undefined,
    });

    logApiResponse("/api/v1/connections/request", {
      status: 201,
      connectionId: connectionRequest.connection.id,
      customerId: connectionRequest.connection.customerId,
    });
    return apiSuccess(connectionRequest, 201);
  } catch (error) {
    logApiError("/api/v1/connections/request", error);
    return apiError("Failed to create connection request", 500);
  }
}
