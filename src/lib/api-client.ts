export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

type RequestBody = BodyInit | Record<string, unknown> | undefined;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: RequestBody;
}

function buildHeaders(options: RequestOptions, body?: RequestBody): Headers {
  const headers = new Headers(options.headers ?? {});

  if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function buildRequestBody(body: RequestBody): BodyInit | undefined {
  if (!body) {
    return undefined;
  }

  if (
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const body = buildRequestBody(options.body);
  const headers = buildHeaders(options, options.body);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "Network request failed",
      0
    );
  }

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed with status ${response.status}`;

    throw new ApiClientError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get<T>(url: string, options: RequestOptions = {}) {
    return apiRequest<T>(url, { ...options, method: "GET" });
  },
  post<T>(url: string, body?: RequestBody, options: RequestOptions = {}) {
    return apiRequest<T>(url, { ...options, method: "POST", body });
  },
};
