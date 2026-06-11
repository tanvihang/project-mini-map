export interface User {
  userId: string;
  email: string;
  displayName: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  displayName: string;
}

// Payload returned (inside the gateway envelope's `data`) by USER_LOGIN and
// USER_REGISTER. The backend is token-less — identity is the `userId`.
export interface AuthResponse {
  isSuccess: boolean;
  userId: string;
  email: string;
  displayName: string;
  createdAt: string;
}
