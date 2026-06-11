import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";

export function healthPing(): Promise<unknown> {
  return api.gateway(OPERATION_TYPES.HEALTH_PING, {});
}
