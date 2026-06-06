import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as journeyService from "@/services/journey";

export function useCreateJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      text,
    }: {
      sessionId: string;
      text: string;
    }) => journeyService.createJourney(sessionId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });
}

export function useDay(journeyId: string, dayNum: number) {
  return useQuery({
    queryKey: ["journey", journeyId, "day", dayNum],
    queryFn: () => journeyService.fetchDay(journeyId, dayNum),
    enabled: !!journeyId && dayNum > 0,
  });
}

export function useFetchChoices(journeyId: string) {
  return useMutation({
    mutationFn: (forDay: number) =>
      journeyService.fetchChoices(journeyId, forDay),
  });
}

export function useSelectChoice(journeyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      forDay,
      selectedIndex,
    }: {
      forDay: number;
      selectedIndex: number;
    }) => journeyService.selectChoice(journeyId, forDay, selectedIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journey", journeyId] });
    },
  });
}

export function useExportJourney(journeyId: string) {
  return useMutation({
    mutationFn: () => journeyService.exportJourney(journeyId),
  });
}
