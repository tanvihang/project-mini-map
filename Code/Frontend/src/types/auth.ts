export interface User {
  id: string;
  email: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
