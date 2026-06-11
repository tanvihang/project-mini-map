import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type { GeoPlace, GeoReachablePayload } from "@/types/geo";

export function geoReachable(
  payload: GeoReachablePayload,
): Promise<{ places: GeoPlace[] }> {
  return api.gateway<{ places: GeoPlace[] }>(
    OPERATION_TYPES.GEO_REACHABLE,
    payload,
  );
}
