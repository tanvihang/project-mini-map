import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as journeyService from "@/services/journey";
import type {
  JourneyChoice,
  JourneyDay,
  JourneyStartPayload,
  JourneyState,
} from "@/types/journey";

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

// Drives a full interactive journey from the client: starts the journey, keeps
// the running list of generated days, and advances to the next day when the
// user picks one of the current day's choices. The active choices are always
// those attached to the most recent day.
export function useJourneySession() {
  const startMutation = useStartJourney();
  const [journeyId, setJourneyId] = useState<string | null>(null);
  // `useNextDay` needs the id up-front; it stays inert until `journeyId` is set.
  const nextDayMutation = useNextDay(journeyId ?? "");

  const [days, setDays] = useState<JourneyDay[]>([]);
  const [state, setState] = useState<JourneyState | null>(null);
  // History of options the user picked, in order. `selectedChoices[i]` is the
  // option chosen on `days[i]` (which produced `days[i + 1]`).
  const [selectedChoices, setSelectedChoices] = useState<JourneyChoice[]>([]);

  const start = (payload: JourneyStartPayload) => {
    startMutation.mutate(payload, {
      onSuccess: (res) => {
        setJourneyId(res.journeyId);
        setState(res.state);
        setDays(res.day ? [res.day] : []);
        setSelectedChoices([]);
      },
    });
  };

  const selectChoice = (chosenIndex: number) => {
    if (!journeyId || nextDayMutation.isPending) return;
    // Record the pick optimistically so it shows in the chat history right
    // away; roll it back if the request fails.
    const chosen = days[days.length - 1]?.choices?.[chosenIndex];
    if (chosen) setSelectedChoices((prev) => [...prev, chosen]);

    nextDayMutation.mutate(chosenIndex, {
      onSuccess: (res) => {
        if (res.day) setDays((prev) => [...prev, res.day]);
      },
      onError: () => {
        if (chosen) setSelectedChoices((prev) => prev.slice(0, -1));
      },
    });
  };

  const reset = () => {
    setJourneyId(null);
    setDays([]);
    setState(null);
    setSelectedChoices([]);
    startMutation.reset();
    nextDayMutation.reset();
  };

  const lastDay = days.length ? days[days.length - 1] : null;

  return {
    journeyId,
    state,
    days,
    selectedChoices,
    // Next-step options come from the most recently generated day.
    choices: lastDay?.choices ?? [],
    start,
    selectChoice,
    reset,
    isStarting: startMutation.isPending,
    isAdvancing: nextDayMutation.isPending,
    isError: startMutation.isError || nextDayMutation.isError,
    error: startMutation.error ?? nextDayMutation.error,
  };
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
