export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  message: string;
  status: number;
}

// Error object carried inside a gateway envelope when `ok` is false.
export interface GatewayError {
  code?: string;
  message?: string;
}

// Every gateway operation responds with this envelope. The useful payload
// lives in `data`; the client unwraps it and throws when `ok` is false.
export interface GatewayResponse<T> {
  ok: boolean;
  operation: string;
  data: T;
  error: GatewayError | null;
}
