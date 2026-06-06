import { api } from "@/api/client";
import { API_ENDPOINTS } from "@/constants/api";
import type { Journey, DayContent, ChoiceCard, ExportPlan } from "@/types/journey";

export function createJourney(sessionId: string, text: string) {
  return api.post<{ journey: Journey; status: string }>(
    API_ENDPOINTS.JOURNEYS,
    { sessionId, text },
  );
}

export function fetchDay(
  journeyId: string,
  dayNum: number,
): Promise<DayContent> {
  return api.get<DayContent>(API_ENDPOINTS.journeyDay(journeyId, dayNum));
}

export function fetchChoices(
  journeyId: string,
  forDay: number,
): Promise<{ choices: ChoiceCard[] }> {
  return api.post<{ choices: ChoiceCard[] }>(
    API_ENDPOINTS.journeyChoices(journeyId),
    { forDay },
  );
}

export function selectChoice(
  journeyId: string,
  forDay: number,
  selectedIndex: number,
): Promise<DayContent> {
  return api.post<DayContent>(API_ENDPOINTS.journeySelect(journeyId), {
    forDay,
    selectedIndex,
  });
}

export function exportJourney(journeyId: string): Promise<ExportPlan> {
  return api.post<ExportPlan>(API_ENDPOINTS.journeyExport(journeyId));
}
