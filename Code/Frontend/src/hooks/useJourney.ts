import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as journeyService from "@/services/journey";
import type { JourneyStartPayload } from "@/types/journey";

export function useStartJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: JourneyStartPayload) =>
      journeyService.startJourney(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });
}

export function useNextDay(journeyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chosenIndex: number) =>
      journeyService.nextDay(journeyId, chosenIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey", journeyId] });
    },
  });
}

export function useJourneyList(userId: string) {
  return useQuery({
    queryKey: ["journey", "list", userId],
    queryFn: () => journeyService.listJourneys(userId),
    enabled: !!userId,
  });
}

export function useGetJourney(journeyId: string) {
  return useQuery({
    queryKey: ["journey", journeyId],
    queryFn: () => journeyService.getJourney(journeyId),
    enabled: !!journeyId,
  });
}
