import { Fragment, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatMinorUnits } from "@/utils/money";
import {
  ChevronLeftIcon,
  MicrophoneIcon,
  PaperclipIcon,
  PaperPlaneIcon,
} from "@/components/ui";
import type {
  JourneyChoice,
  JourneyDay,
  JourneyState,
} from "@/types/journey";
import { JourneyChoices } from "./JourneyChoices";
import { JourneyDayCard } from "./JourneyDayCard";

interface JourneyViewProps {
  userMessage: string;
  days: JourneyDay[];
  // Options already picked. `selectedChoices[i]` is the option chosen on
  // `days[i]`; the last day has no entry until the user picks.
  selectedChoices: JourneyChoice[];
  choices: JourneyChoice[];
  state: JourneyState | null;
  isStarting: boolean;
  isAdvancing: boolean;
  isError: boolean;
  error?: Error | null;
  onSelectChoice: (index: number) => void;
  onReset: () => void;
}

export function JourneyView({
  userMessage,
  days,
  selectedChoices,
  choices,
  state,
  isStarting,
  isAdvancing,
  isError,
  error,
  onSelectChoice,
  onReset,
}: JourneyViewProps) {
  const { t } = useTranslation(["journey", "common"]);

  // Keep the chat scrolled to the newest content as the journey unfolds.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [days.length, selectedChoices.length, isAdvancing]);

  const lastDay = days.length ? days[days.length - 1] : null;
  const currentDayNumber = lastDay?.dayNumber ?? state?.currentDay ?? 0;
  const totalDays = state?.totalDays ?? 0;

  // Remaining budget is derived live: total minus the cost of every day so far
  // (JOURNEY_NEXT_DAY doesn't echo the updated state, so we accumulate prices).
  const spentMinor = days.reduce(
    (sum, day) => sum + (Number(day.price?.minor) || 0),
    0,
  );
  const remainingMinor = (state?.totalBudgetMinor ?? 0) - spentMinor;

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-7xl gap-4 px-4 py-4">
      {/* Left — interactive chat: request, day dialogues, picks, choices */}
      <aside className="flex w-full max-w-sm shrink-0 flex-col rounded-2xl border border-panel-border bg-white">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* The original request */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-ui text-ui text-book-text">
              {userMessage}
            </div>
          </div>

          {isStarting && (
            <p className="font-ui text-ui-sm text-book-text-muted">
              {t("journey:compose.starting")}
            </p>
          )}

          {/* Start failed before any day arrived */}
          {isError && days.length === 0 && (
            <ErrorNote message={error?.message} t={t} />
          )}

          {days.map((day, i) => (
            <Fragment key={day.dayNumber}>
              <DayMarker day={day} t={t} />

              {day.dialogues?.map((line, j) => (
                <DialogueBubble key={j} line={line} />
              ))}

              {selectedChoices[i] ? (
                // History: the option the user picked on this day.
                <ChosenBubble choice={selectedChoices[i]} label={t("journey:active.youChose")} />
              ) : i === days.length - 1 ? (
                // Latest day with no pick yet — offer the options.
                <JourneyChoices
                  choices={choices}
                  isAdvancing={isAdvancing}
                  onSelect={onSelectChoice}
                />
              ) : null}
            </Fragment>
          ))}

          {isAdvancing && (
            <p className="font-ui text-ui-sm text-book-text-muted">
              {t("journey:choices.advancing")}
            </p>
          )}

          {/* Advancing failed — the pick was rolled back, options are back */}
          {isError && days.length > 0 && (
            <ErrorNote message={error?.message} t={t} />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Remaining budget — running total beneath the conversation */}
        {state && days.length > 0 && (
          <div className="flex items-center justify-between border-t border-panel-border px-5 py-3">
            <span className="font-ui text-ui-sm text-book-text-muted">
              {t("journey:remainingBudget")}
            </span>
            <span
              className={
                remainingMinor < 0
                  ? "font-money text-money text-error"
                  : "font-money text-money text-book-text"
              }
            >
              {formatMinorUnits(remainingMinor, state.budgetCurrency)}
            </span>
          </div>
        )}

        {/* No-op composer — kept for visual continuity */}
        <div className="border-t border-panel-border p-3">
          <div className="rounded-3xl bg-input-bg p-3">
            <input
              placeholder={t("journey:compose.placeholder")}
              className="w-full bg-transparent px-2 font-ui text-ui text-book-text outline-none placeholder:text-book-text-muted/70"
            />
            <div className="mt-2 flex items-center justify-between">
              <PaperclipIcon className="h-5 w-5 text-book-text-muted" />
              <div className="flex items-center gap-2">
                <MicrophoneIcon className="h-5 w-5 text-book-text-muted" />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-book-text">
                  <PaperPlaneIcon className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right — the journey, one day card per generated day */}
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-panel-border bg-white">
        <header className="flex items-center gap-3 border-b border-panel-border px-5 py-4">
          <button
            type="button"
            onClick={onReset}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-panel-border text-book-text transition hover:bg-panel-bg"
            aria-label={t("journey:active.newTrip")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-journal text-title font-semibold text-book-text">
              {state?.destination || t("journey:active.responseTitle")}
            </h2>
            <p className="font-ui text-ui-sm text-book-text-muted">
              {t("journey:active.responseHint")}
            </p>
          </div>
          {currentDayNumber > 0 && (
            <span className="shrink-0 rounded-full bg-panel-bg px-3 py-1.5 font-ui text-ui-sm font-medium text-book-text">
              {t("journey:active.dayProgress", {
                current: currentDayNumber,
                total: totalDays,
              })}
            </span>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {isStarting ? (
            <p className="font-ui text-ui text-book-text-muted">
              {t("journey:compose.starting")}
            </p>
          ) : days.length > 0 ? (
            <div className="flex flex-col gap-4">
              {days.map((day) => (
                <JourneyDayCard key={day.dayNumber} day={day} />
              ))}
            </div>
          ) : isError ? (
            <ErrorNote message={error?.message} t={t} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

// --- Chat pieces ------------------------------------------------------------

function DayMarker({
  day,
  t,
}: {
  day: JourneyDay;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <div className="pt-2 text-center">
      <p className="font-ui text-ui-sm font-medium uppercase tracking-wide text-book-text-muted">
        {t("dayCard.dayLabel", { day: day.dayNumber })}
        {day.time ? ` · ${day.time}` : ""}
      </p>
      <p className="mt-0.5 font-journal text-ui-lg font-semibold text-book-text">
        {day.title}
      </p>
    </div>
  );
}

function DialogueBubble({
  line,
}: {
  line: JourneyDay["dialogues"][number];
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-panel-bg px-4 py-3">
        {line.speaker && (
          <p className="font-ui text-ui-sm font-medium text-book-text-muted">
            {line.speaker}
          </p>
        )}
        <p className="font-ui text-ui text-book-text">{line.text}</p>
        {line.translation && (
          <p className="mt-1 font-ui text-ui-sm italic text-book-text-muted">
            {line.translation}
          </p>
        )}
      </div>
    </div>
  );
}

function ChosenBubble({
  choice,
  label,
}: {
  choice: JourneyChoice;
  label: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3">
        <p className="font-ui text-ui-sm font-medium text-book-text/70">
          {label}
        </p>
        <p className="font-ui text-ui font-medium text-book-text">
          {choice.title}
        </p>
      </div>
    </div>
  );
}

function ErrorNote({
  message,
  t,
}: {
  message?: string;
  t: (key: string) => string;
}) {
  return (
    <div className="rounded-sm border border-error/30 bg-error/5 p-3">
      <p className="font-ui text-ui-sm font-semibold text-error">
        {t("journey:compose.startError")}
      </p>
      {message && (
        <p className="mt-1 font-mono text-ui-sm text-book-text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
