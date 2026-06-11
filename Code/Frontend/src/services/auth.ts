import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type { AuthResponse, SignInPayload, SignUpPayload } from "@/types/auth";

export function signIn(payload: SignInPayload): Promise<AuthResponse> {
  return api.gateway<AuthResponse>(OPERATION_TYPES.USER_LOGIN, payload);
}

export function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  return api.gateway<AuthResponse>(OPERATION_TYPES.USER_REGISTER, payload);
}
