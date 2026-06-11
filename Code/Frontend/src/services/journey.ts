import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type {
  JourneyListResult,
  JourneyNextDayResult,
  JourneyResult,
  JourneyStartPayload,
  JourneyStartResult,
} from "@/types/journey";

// JOURNEY_START returns the new journey `state` plus the first `day` (which
// carries the next-step `choices`), verified against the live gateway.
export function startJourney(
  payload: JourneyStartPayload,
): Promise<JourneyStartResult> {
  return api.gateway<JourneyStartResult>(
    OPERATION_TYPES.JOURNEY_START,
    payload,
  );
}

// JOURNEY_NEXT_DAY advances the journey by the chosen option index and returns
// the newly generated `day` (with its own fresh `choices`).
export function nextDay(
  journeyId: string,
  chosenIndex: number,
): Promise<JourneyNextDayResult> {
  return api.gateway<JourneyNextDayResult>(OPERATION_TYPES.JOURNEY_NEXT_DAY, {
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
