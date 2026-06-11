import { useState } from "react";
import { authFacade } from "@/store/auth/facade";
import { useJourneySession } from "@/hooks/useJourney";
import { ComposeView, JourneyView } from "@/components/book";
import type { JourneyStartPayload } from "@/types/journey";

export function BookScreen() {
  const user = authFacade.user();
  const session = useJourneySession();

  // Non-null once the user sends — this is what flips the screen from the
  // compose state to the active (journey) state.
  const [userMessage, setUserMessage] = useState<string | null>(null);

  const handleStart = (payload: JourneyStartPayload, message: string) => {
    setUserMessage(message);
    session.start(payload);
  };

  if (userMessage === null) {
    return (
      <ComposeView
        userId={user?.userId ?? ""}
        displayName={user?.displayName}
        isStarting={session.isStarting}
        onStart={handleStart}
      />
    );
  }

  return (
    <JourneyView
      userMessage={userMessage}
      days={session.days}
      selectedChoices={session.selectedChoices}
      choices={session.choices}
      state={session.state}
      isStarting={session.isStarting}
      isAdvancing={session.isAdvancing}
      isError={session.isError}
      error={session.error}
      onSelectChoice={session.selectChoice}
    />
  );
}
