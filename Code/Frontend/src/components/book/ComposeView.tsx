import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import {
  ArrowDownIcon,
  MapPinIcon,
  MicrophoneIcon,
  PaperclipIcon,
  PaperPlaneIcon,
} from "@/components/ui";
import type { JourneyStartPayload } from "@/types/journey";
import heroVideo from "@/assets/video/travel.mp4";

// Presets for the journey-start payload. These string values are sent to the
// gateway verbatim, so they double as both the option value and (capitalized)
// the display label.
const TRAVEL_STYLES = [
  "balanced",
  "luxury",
  "budget",
  "adventure",
  "cultural",
  "relaxed",
] as const;

const INTERESTS = [
  "food",
  "culture",
  "nature",
  "history",
  "nightlife",
  "shopping",
  "art",
  "adventure",
] as const;

const CURRENCIES = ["MYR", "USD", "EUR", "JPY", "SGD"] as const;

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

// Shared pill shell — matches the suggestion-chip look for the value inputs.
const pillClass =
  "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-3 font-ui text-ui-sm text-book-text shadow-card";

interface ComposeViewProps {
  userId: string;
  displayName?: string;
  isStarting: boolean;
  onStart: (payload: JourneyStartPayload, message: string) => void;
}

export function ComposeView({
  userId,
  displayName,
  isStarting,
  onStart,
}: ComposeViewProps) {
  const { t } = useTranslation(["journey", "common"]);

  // The chat draft is intentionally a no-op for journey planning — its text is
  // only echoed into the chat panel once the journey starts.
  const [draft, setDraft] = useState("");

  // Journey-start payload fields.
  const [destination, setDestination] = useState("");
  const [totalDays, setTotalDays] = useState(7);
  const [budgetMajor, setBudgetMajor] = useState(5000);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [travelStyle, setTravelStyle] = useState<string>(TRAVEL_STYLES[0]);
  const [interests, setInterests] = useState<string[]>(["food", "culture"]);

  const firstName = displayName?.trim().split(/\s+/)[0];
  const greeting = firstName
    ? t("journey:compose.greeting", { name: firstName })
    : t("journey:compose.greetingFallback");

  const canStart = destination.trim().length > 0 && totalDays > 0 && !isStarting;

  const toggleInterest = (value: string) =>
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((i) => i !== value)
        : [...prev, value],
    );

  const handleSend = () => {
    if (!canStart) return;
    const payload: JourneyStartPayload = {
      userId,
      destination: destination.trim(),
      totalDays,
      // Backend expects minor units as a string (e.g. "500000" = 5000.00).
      totalBudgetMinor: String(Math.round(budgetMajor * 100)),
      budgetCurrency: currency,
      travelStyle,
      interests,
    };
    // Fall back to a generated summary so the chat panel is never empty.
    const message =
      draft.trim() ||
      `Plan me ${totalDays} days in ${destination.trim()} (${travelStyle}).`;
    onStart(payload, message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center  gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
      {/* Left — greeting, composer, trip-detail chips */}
      <div className="order-2 lg:order-1">
        <h1 className="font-journal text-4xl leading-tight text-book-text sm:text-5xl">
          {greeting}
        </h1>

        {/* Chat composer (typing is a no-op; the purple button starts the journey) */}
        <div className="mt-8 rounded-3xl bg-white p-4 shadow-card">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={t("journey:compose.placeholder")}
            className="w-full resize-none bg-transparent px-2 py-1 font-ui text-ui text-book-text outline-none placeholder:text-book-text-muted/70"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            {/* <button
              type="button"
              aria-label="Attach"
              className="flex h-9 w-9 items-center justify-center rounded-full text-book-text-muted transition hover:bg-panel-bg hover:text-book-text"
            >
              <PaperclipIcon className="h-5 w-5" />
            </button> */}
            <div className="flex items-center gap-2">
              {/* <button
                type="button"
                aria-label="Voice input"
                className="flex h-9 w-9 items-center justify-center rounded-full text-book-text-muted transition hover:bg-panel-bg hover:text-book-text"
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button> */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!canStart}
                aria-label={t("journey:compose.send")}
                aria-busy={isStarting || undefined}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#cdbcf7] text-book-text transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PaperPlaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Trip details — minimal, suggestion-chip style, beneath the chat */}
        <div className="mt-4 space-y-3">
          {/* Value pills: destination, days, budget + currency */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={pillClass}>
              <MapPinIcon className="h-4 w-4 text-book-text-muted" />
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t("journey:compose.destination")}
                className="w-28 bg-transparent outline-none placeholder:text-book-text-muted/70"
              />
            </span>

            <span className={pillClass}>
              <input
                type="number"
                min={1}
                max={30}
                value={totalDays}
                onChange={(e) => setTotalDays(Number(e.target.value) || 0)}
                aria-label={t("journey:compose.days")}
                className="w-8 bg-transparent text-right outline-none"
              />
              <span className="text-book-text-muted">
                {t("journey:compose.days")}
              </span>
            </span>

            <span className={pillClass}>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                aria-label={t("journey:compose.currency")}
                className="bg-transparent outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step={100}
                value={budgetMajor}
                onChange={(e) => setBudgetMajor(Number(e.target.value) || 0)}
                aria-label={t("journey:compose.budget")}
                className="w-20 bg-transparent outline-none"
              />
            </span>
          </div>

          {/* Travel style — single select */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 font-ui text-ui-sm text-book-text-muted">
              {t("journey:compose.travelStyle")}
            </span>
            {TRAVEL_STYLES.map((style) => (
              <Chip
                key={style}
                selected={travelStyle === style}
                onClick={() => setTravelStyle(style)}
              >
                {titleCase(style)}
              </Chip>
            ))}
          </div>

          {/* Interests — multi select */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 font-ui text-ui-sm text-book-text-muted">
              {t("journey:compose.interests")}
            </span>
            {INTERESTS.map((interest) => (
              <Chip
                key={interest}
                selected={interests.includes(interest)}
                onClick={() => toggleInterest(interest)}
              >
                {titleCase(interest)}
              </Chip>
            ))}
          </div>
        </div>

        {/* <p className="mt-6 flex items-center justify-center gap-1.5 font-ui text-ui text-book-text">
          {t("journey:compose.seeHow")}
          <ArrowDownIcon className="h-4 w-4" />
        </p> */}
      </div>

      {/* Right — clover hero media */}
      <div className="order-1 lg:order-2">
        <CloverMedia src={heroVideo} />
      </div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full px-3 py-1.5 font-ui text-ui-sm font-medium shadow-card transition",
        selected
          ? "bg-[#cdbcf7] text-book-text"
          : "bg-white text-book-text hover:bg-panel-bg",
      )}
    >
      {children}
    </button>
  );
}

// A quatrefoil/clover frame built from four overlapping circles, matching the
// hero shape in the design. The clip-path uses objectBoundingBox units so it
// scales with the square container.
function CloverMedia({ src }: { src: string }) {
  return (
    <div className="mx-auto aspect-square w-full max-w-lg">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="book-clover" clipPathUnits="objectBoundingBox">
            <circle cx="0.32" cy="0.32" r="0.32" />
            <circle cx="0.68" cy="0.32" r="0.32" />
            <circle cx="0.32" cy="0.68" r="0.32" />
            <circle cx="0.68" cy="0.68" r="0.32" />
          </clipPath>
        </defs>
      </svg>
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        style={{ clipPath: "url(#book-clover)" }}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
