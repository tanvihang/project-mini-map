import { config } from "@/config";
import { authHeader } from "./interceptors";
import { API_GATEWAY, type OperationType } from "@/constants/api";
import type { GatewayResponse } from "@/types/api";

class ApiClientError extends Error {
  status: number;
  operation: OperationType;
  constructor(message: string, status: number, operation: OperationType) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.operation = operation;
  }
}

// Every backend call goes through the single gateway endpoint, selecting the
// operation via the `X-Operation-Type` header. Responses are wrapped in a
// `{ ok, operation, data, error }` envelope — we unwrap `data` and throw when
// `ok` is false so callers receive (and type) only the payload.
async function gatewayRequest<T>(
  operation: OperationType,
  body: unknown,
): Promise<T> {
  const url = `${config.apiBaseUrl}${API_GATEWAY}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Operation-Type": operation,
    ...authHeader(),
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const envelope = (await res
    .json()
    .catch(() => null)) as GatewayResponse<T> | null;

  if (!res.ok || !envelope || !envelope.ok || envelope.error) {
    // On failure the human-readable message lives in `data.errorMessage`;
    // `error` is an error-code string. Fall back to either, then status.
    const errorData = envelope?.data as { errorMessage?: string } | undefined;
    const message =
      errorData?.errorMessage ??
      (typeof envelope?.error === "string" ? envelope.error : undefined) ??
      `Gateway operation ${operation} failed with status ${res.status}`;
    throw new ApiClientError(message, res.status, operation);
  }

  return envelope.data;
}

export const api = {
  gateway: <T>(operation: OperationType, body: unknown = {}) =>
    gatewayRequest<T>(operation, body),
};
