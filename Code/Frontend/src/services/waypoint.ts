import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type {
  Waypoint,
  WaypointAddPayload,
  WaypointSuggestion,
} from "@/types/waypoint";

export function addWaypoint(
  payload: WaypointAddPayload,
): Promise<{ waypoints: Waypoint[] }> {
  return api.gateway<{ waypoints: Waypoint[] }>(
    OPERATION_TYPES.WAYPOINT_ADD,
    payload,
  );
}

export function removeWaypoint(
  journeyId: string,
  waypointIndex: number,
): Promise<{ waypoints: Waypoint[] }> {
  return api.gateway<{ waypoints: Waypoint[] }>(OPERATION_TYPES.WAYPOINT_REMOVE, {
    journeyId,
    waypointIndex,
  });
}

export function suggestWaypoints(
  journeyId: string,
  fromDay: number,
  toDay: number,
): Promise<{ suggestions: WaypointSuggestion[] }> {
  return api.gateway<{ suggestions: WaypointSuggestion[] }>(
    OPERATION_TYPES.WAYPOINT_SUGGEST,
    { journeyId, fromDay, toDay },
  );
}
