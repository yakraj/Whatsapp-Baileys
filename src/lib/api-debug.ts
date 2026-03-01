const DEBUG_ENABLED =
  process.env.API_DEBUG_LOGS === "1" || process.env.NODE_ENV !== "production";

function nowIso(): string {
  return new Date().toISOString();
}

export function logApiRequest(
  route: string,
  payload: {
    method: string;
    authProvided?: boolean;
    contentType?: string | null;
    query?: Record<string, string>;
    body?: unknown;
  }
): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  console.log(`[api][${nowIso()}][request] ${route}`, payload);
}

export function logApiResponse(route: string, payload: unknown): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  console.log(`[api][${nowIso()}][response] ${route}`, payload);
}

export function logApiError(route: string, error: unknown): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  console.error(`[api][${nowIso()}][error] ${route}`, error);
}
