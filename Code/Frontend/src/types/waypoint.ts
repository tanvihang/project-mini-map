// Request payload for the WAYPOINT_ADD gateway operation.
// Coordinates are [longitude, latitude] tuples, matching the gateway contract.
export interface WaypointAddPayload {
  journeyId: string;
  name: string;
  coordinates: [number, number];
  betweenDays: [number, number];
}

// Best-effort response shapes — refine against the live WAYPOINT_* responses.
export interface Waypoint {
  name: string;
  coordinates: [number, number];
}

export interface WaypointSuggestion {
  name: string;
  coordinates: [number, number];
  reason?: string;
}
