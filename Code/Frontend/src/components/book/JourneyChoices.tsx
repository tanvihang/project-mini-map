import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { formatMinorUnits } from "@/utils/money";
import { CHOICE_TYPES, type ChoiceType } from "@/constants/journey";
import type { JourneyChoice } from "@/types/journey";

// Per-type accent dot. Full class strings (not interpolated) so Tailwind's
// scanner keeps them — see the --color-accent-* tokens in index.css.
const ACCENT_DOT: Record<ChoiceType, string> = {
  [CHOICE_TYPES.MOVE]: "bg-accent-move",
  [CHOICE_TYPES.ACTIVITY]: "bg-accent-activity",
  [CHOICE_TYPES.EXPLORE]: "bg-accent-explore",
  [CHOICE_TYPES.SLOW]: "bg-accent-slow",
};

interface JourneyChoicesProps {
  choices: JourneyChoice[];
  isAdvancing: boolean;
  onSelect: (index: number) => void;
}

// Renders the current day's next-step options as selectable cards in the chat
// panel. Picking one advances the journey via the chosen index.
export function JourneyChoices({
  choices,
  isAdvancing,
  onSelect,
}: JourneyChoicesProps) {
  const { t } = useTranslation("journey");

  if (!choices.length) return null;

  return (
    <div className="mt-5">
      <p className="mb-2 font-ui text-ui-sm font-medium text-book-text-muted">
        {t("choices.prompt")}
      </p>

      <div className="flex flex-col gap-2">
        {choices.map((choice, index) => (
          <button
            key={`${index}-${choice.title}`}
            type="button"
            disabled={isAdvancing}
            onClick={() => onSelect(index)}
            className={cn(
              "group rounded-2xl border border-panel-border bg-white p-3 text-left transition",
              "hover:border-primary hover:shadow-card",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-ui text-ui-sm font-medium text-book-text-muted">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    ACCENT_DOT[choice.type] ?? "bg-book-text-muted",
                  )}
                />
                {t(`choices.type.${choice.type}`, choice.type)}
              </span>
              <span className="shrink-0 font-ui text-ui-sm text-book-text-muted">
                {formatMinorUnits(choice.estimatedCostMinor, choice.currency)}
              </span>
            </div>

            <p className="mt-1.5 font-ui text-ui font-semibold text-book-text">
              {choice.title}
            </p>
            <p className="mt-0.5 line-clamp-2 font-ui text-ui-sm leading-relaxed text-book-text-muted">
              {choice.description}
            </p>
          </button>
        ))}
      </div>

      {isAdvancing && (
        <p className="mt-3 font-ui text-ui-sm text-book-text-muted">
          {t("choices.advancing")}
        </p>
      )}
    </div>
  );
}
