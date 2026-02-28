import { apiError, apiSuccess } from "@/lib/api-response";
import { createConnectionRequest } from "@/lib/gateway-store";
import { requestConnectionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = requestConnectionSchema.safeParse(body);

    if (!result.success) {
      return apiError("Invalid connection payload", 400, result.error.flatten());
    }

    const connectionRequest = await createConnectionRequest({
      customerId: result.data.customerId,
      customerName: result.data.customerName,
      websiteUrl: result.data.websiteUrl || undefined,
    });

    return apiSuccess(connectionRequest, 201);
  } catch {
    return apiError("Failed to create connection request", 500);
  }
}
