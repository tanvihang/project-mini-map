import { api } from "@/api/client";
import { API_ENDPOINTS } from "@/constants/api";
import type { PassportStamp } from "@/types/passport";

export function fetchPassport(
  userId: string,
): Promise<{ stamps: PassportStamp[] }> {
  return api.get<{ stamps: PassportStamp[] }>(
    API_ENDPOINTS.userPassport(userId),
  );
}
