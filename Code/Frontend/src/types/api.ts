export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  message: string;
  status: number;
}

// When an operation fails, the envelope's `data` carries these fields and the
// top-level `error` holds the error code string (e.g. "ERR_AUTH_FAILED").
export interface GatewayErrorData {
  isSuccess: false;
  errorCode: string;
  errorMessage: string;
  fallbackAction?: string;
}

// Every gateway operation responds with this envelope. The useful payload
// lives in `data`; the client unwraps it and throws when `ok` is false.
export interface GatewayResponse<T> {
  ok: boolean;
  operation: string;
  data: T;
  error: string | null;
}
