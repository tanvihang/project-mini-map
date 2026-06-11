import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatMinorUnits } from "@/utils/money";
import { MapPinIcon } from "@/components/ui";
import type { JourneyDay } from "@/types/journey";

interface JourneyDayCardProps {
  day: JourneyDay;
}

// A single day of the journey. Intentionally simple for now — a flat stack of
// labelled sections (title, time, location, story, senses, dialogues, culture,
// practical, weather, price); richer styling comes later.
export function JourneyDayCard({ day }: JourneyDayCardProps) {
  const { t } = useTranslation("journey");

  return (
    <article className="rounded-2xl border border-panel-border bg-white p-5">
      {/* Header — day number, title, time, location */}
      <header className="border-b border-panel-border pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-ui text-ui-sm font-medium uppercase tracking-wide text-book-text-muted">
            {t("dayCard.dayLabel", { day: day.dayNumber })}
          </span>
          {day.time && (
            <span className="font-ui text-ui-sm text-book-text-muted">
              {day.time}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-journal text-title font-semibold text-book-text">
          {day.title}
        </h3>
        {day.location?.name && (
          <p className="mt-1 flex items-center gap-1.5 font-ui text-ui-sm text-book-text-muted">
            <MapPinIcon className="h-4 w-4" />
            {day.location.name}
          </p>
        )}
      </header>

      {/* Story */}
      {day.story && (
        <Section label={t("dayCard.story")}>
          <p className="font-journal text-body leading-relaxed text-book-text">
            {day.story}
          </p>
        </Section>
      )}

      {/* Senses */}
      {day.senses && (
        <Section label={t("dayCard.senses")}>
          <dl className="grid gap-2 sm:grid-cols-2">
            {(
              ["see", "hear", "smell", "taste", "touch", "mood"] as const
            ).map((sense) =>
              day.senses[sense] ? (
                <div key={sense} className="flex gap-2">
                  <dt className="shrink-0 font-ui text-ui-sm font-medium text-book-text-muted">
                    {t(`dayCard.${sense}`)}
                  </dt>
                  <dd className="font-ui text-ui-sm text-book-text">
                    {day.senses[sense]}
                  </dd>
                </div>
              ) : null,
            )}
          </dl>
        </Section>
      )}

      {/* Dialogues */}
      {day.dialogues?.length > 0 && (
        <Section label={t("dayCard.dialogues")}>
          <ul className="space-y-2">
            {day.dialogues.map((line, index) => (
              <li
                key={index}
                className="rounded-xl bg-panel-bg px-3 py-2 font-ui text-ui-sm"
              >
                <p className="font-medium text-book-text">
                  {line.speaker}: {line.text}
                </p>
                {line.translation && (
                  <p className="mt-0.5 text-book-text-muted">
                    {line.translation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Culture */}
      {day.culture && (
        <Section label={t("dayCard.culture")}>
          {day.culture.tips?.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 font-ui text-ui-sm text-book-text">
              {day.culture.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          )}
          {day.culture.localPhrase?.phrase && (
            <p className="mt-2 font-ui text-ui-sm text-book-text">
              <span className="font-medium">
                {day.culture.localPhrase.phrase}
              </span>
              {day.culture.localPhrase.pronunciation &&
                ` (${day.culture.localPhrase.pronunciation})`}
              {day.culture.localPhrase.meaning &&
                ` — ${day.culture.localPhrase.meaning}`}
            </p>
          )}
        </Section>
      )}

      {/* Practical */}
      {day.practical && (
        <Section label={t("dayCard.practical")}>
          <dl className="grid gap-2 sm:grid-cols-2">
            <Fact
              label={t("dayCard.openingHours")}
              value={day.practical.openingHours}
            />
            <Fact
              label={t("dayCard.crowdLevel")}
              value={day.practical.crowdLevel}
            />
            <Fact
              label={t("dayCard.bestTimeToVisit")}
              value={day.practical.bestTimeToVisit}
            />
            <Fact label={t("dayCard.photoTip")} value={day.practical.photoTip} />
          </dl>
        </Section>
      )}

      {/* Weather + price — compact footer row */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-panel-border pt-4">
        {day.weather?.condition && (
          <span className="rounded-full bg-panel-bg px-3 py-1 font-ui text-ui-sm text-book-text">
            {t("dayCard.weather")}: {day.weather.condition}
            {typeof day.weather.tempC === "number" &&
              ` · ${day.weather.tempC}°C`}
          </span>
        )}
        {day.price?.minor && (
          <span className="rounded-full bg-panel-bg px-3 py-1 font-money text-money text-book-text">
            {t("dayCard.price")}:{" "}
            {formatMinorUnits(day.price.minor, day.price.currency)}
          </span>
        )}
      </div>
    </article>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <h4 className="mb-1.5 font-ui text-ui-sm font-semibold uppercase tracking-wide text-book-text-muted">
        {label}
      </h4>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-ui text-ui-sm font-medium text-book-text-muted">
        {label}
      </dt>
      <dd className="font-ui text-ui-sm text-book-text">{value}</dd>
    </div>
  );
}
