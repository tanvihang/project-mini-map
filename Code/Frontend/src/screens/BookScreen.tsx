import { useState } from "react";
import { authFacade } from "@/store/auth/facade";
import { useStartJourney } from "@/hooks/useJourney";
import { ComposeView, JourneyView } from "@/components/book";
import type { JourneyStartPayload } from "@/types/journey";

export function BookScreen() {
  const user = authFacade.user();
  const startJourney = useStartJourney();

  // Non-null once the user sends — this is what flips the screen from the
  // compose state to the active (journey) state.
  const [userMessage, setUserMessage] = useState<string | null>(null);

  const handleStart = (payload: JourneyStartPayload, message: string) => {
    setUserMessage(message);
    startJourney.mutate(payload);
  };

  const handleReset = () => {
    setUserMessage(null);
    startJourney.reset();
  };

  if (userMessage === null) {
    return (
      <ComposeView
        userId={user?.userId ?? ""}
        displayName={user?.displayName}
        isStarting={startJourney.isPending}
        onStart={handleStart}
      />
    );
  }

  return (
    <JourneyView
      userMessage={userMessage}
      isPending={startJourney.isPending}
      isError={startJourney.isError}
      error={startJourney.error}
      result={startJourney.data}
      onReset={handleReset}
    />
  );
}
