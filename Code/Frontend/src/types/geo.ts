// Request payload for the GEO_REACHABLE gateway operation.
export interface GeoReachablePayload {
  longitude: number;
  latitude: number;
  maxDistanceMeters: number;
  excludeTags: string[];
  interestQuery: string;
}

// Best-effort response shape — refine against the live GEO_REACHABLE response.
export interface GeoPlace {
  name: string;
  coordinates: [number, number];
  distanceMeters: number;
  tags: string[];
}
