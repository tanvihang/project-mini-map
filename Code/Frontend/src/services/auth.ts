import { api } from "@/api/client";
import type { AuthResponse, SignInPayload, SignUpPayload } from "@/types/auth";

export function signIn(payload: SignInPayload): Promise<AuthResponse> {
  return api.post<AuthResponse>("/api/auth/sign-in", payload);
}

export function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  return api.post<AuthResponse>("/api/auth/sign-up", payload);
}
