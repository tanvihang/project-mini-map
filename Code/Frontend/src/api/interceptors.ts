import { getItem } from "@/storage";
import type { User } from "@/types/auth";

export function getAuthToken(): string | null {
  const user = getItem<{ user: User; token: string }>("mini-map-auth");
  return user?.token ?? null;
}

export function authHeader(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
