import { useTranslation } from "react-i18next";
import {
  ChevronLeftIcon,
  MicrophoneIcon,
  PaperclipIcon,
  PaperPlaneIcon,
} from "@/components/ui";
import type { JourneyChoice, JourneyDay } from "@/types/journey";
import { JourneyChoices } from "./JourneyChoices";
import { JourneyDayCard } from "./JourneyDayCard";

interface JourneyViewProps {
  userMessage: string;
  days: JourneyDay[];
  choices: JourneyChoice[];
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
  choices,
  isStarting,
  isAdvancing,
  isError,
  error,
  onSelectChoice,
  onReset,
}: JourneyViewProps) {
  const { t } = useTranslation(["journey", "common"]);

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-7xl gap-4 px-4 py-4">
      {/* Left — chat: the user's request, then the current day's choices */}
      <aside className="flex w-full max-w-sm shrink-0 flex-col rounded-2xl border border-panel-border bg-white">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-ui text-ui text-book-text">
              {userMessage}
            </div>
          </div>

          {isStarting && (
            <p className="mt-4 font-ui text-ui-sm text-book-text-muted">
              {t("journey:compose.starting")}
            </p>
          )}

          {isError && (
            <div className="mt-4 rounded-sm border border-error/30 bg-error/5 p-3">
              <p className="font-ui text-ui-sm font-semibold text-error">
                {t("journey:compose.startError")}
              </p>
              {error?.message && (
                <p className="mt-1 font-mono text-ui-sm text-book-text-muted">
                  {error.message}
                </p>
              )}
            </div>
          )}

          <JourneyChoices
            choices={choices}
            isAdvancing={isAdvancing}
            onSelect={onSelectChoice}
          />
        </div>

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
            className="flex h-9 w-9 items-center justify-center rounded-full border border-panel-border text-book-text transition hover:bg-panel-bg"
            aria-label={t("journey:active.newTrip")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-journal text-title font-semibold text-book-text">
              {t("journey:active.responseTitle")}
            </h2>
            <p className="font-ui text-ui-sm text-book-text-muted">
              {t("journey:active.responseHint")}
            </p>
          </div>
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
            <div className="rounded-sm border border-error/30 bg-error/5 p-4">
              <p className="font-ui text-ui font-semibold text-error">
                {t("journey:compose.startError")}
              </p>
              {error?.message && (
                <p className="mt-1 font-mono text-ui-sm text-book-text-muted">
                  {error.message}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
