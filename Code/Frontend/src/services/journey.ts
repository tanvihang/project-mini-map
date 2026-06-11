import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type {
  JourneyListResult,
  JourneyResult,
  JourneyStartPayload,
} from "@/types/journey";

// NOTE: JOURNEY_START / JOURNEY_NEXT_DAY response shapes are best-effort —
// assumed consistent with the verified JOURNEY_GET envelope. Confirm against
// the live responses (both are mutating, so they were not smoke-tested here).
export function startJourney(
  payload: JourneyStartPayload,
): Promise<JourneyResult> {
  return api.gateway<JourneyResult>(OPERATION_TYPES.JOURNEY_START, payload);
}

export function nextDay(
  journeyId: string,
  chosenIndex: number,
): Promise<JourneyResult> {
  return api.gateway<JourneyResult>(OPERATION_TYPES.JOURNEY_NEXT_DAY, {
    journeyId,
    chosenIndex,
  });
}

export function listJourneys(userId: string): Promise<JourneyListResult> {
  return api.gateway<JourneyListResult>(OPERATION_TYPES.JOURNEY_LIST, {
    userId,
  });
}

export function getJourney(journeyId: string): Promise<JourneyResult> {
  return api.gateway<JourneyResult>(OPERATION_TYPES.JOURNEY_GET, { journeyId });
}
