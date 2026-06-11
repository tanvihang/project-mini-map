import { useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetJourney } from "@/hooks/useJourney";
import { JourneyDayCard } from "@/components/book";
import { PanelTabs } from "@/components/ui";
import { cn } from "@/utils/cn";
import { formatMinorUnits } from "@/utils/money";

export function TripScreen() {
  const { journeyId = "" } = useParams();
  const { t } = useTranslation(["passport", "journey"]);
  const { data, isPending, isError } = useGetJourney(journeyId);

  // On mobile the summary and itinerary can't sit side by side, so the user
  // toggles between them; the itinerary is the main content, so it leads.
  // On lg+ both are always visible and this is ignored.
  const [mobileTab, setMobileTab] = useState<"summary" | "itinerary">(
    "itinerary",
  );

  const journey = data?.journey;
  const days = journey?.days ?? [];

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-7xl flex-col gap-3 px-3 py-3 lg:flex-row lg:gap-4 lg:px-4 lg:py-4">
      {/* Mobile-only switcher between the two panels (both shown on lg+) */}
      <PanelTabs
        className="lg:hidden"
        active={mobileTab}
        onChange={setMobileTab}
        tabs={[
          { value: "summary", label: t("passport:detail.tabSummary") },
          { value: "itinerary", label: t("passport:detail.tabItinerary") },
        ]}
      />

      {/* Left — trip summary, mirroring the journey chat panel */}
      <aside
        className={cn(
          "min-h-0 w-full flex-1 flex-col rounded-2xl border border-panel-border bg-white",
          "lg:max-w-sm lg:flex-none lg:shrink-0 lg:flex",
          mobileTab === "summary" ? "flex" : "hidden",
        )}
      >
        <div className="flex-1 overflow-y-auto p-5">
          {journey && (
            <>
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 font-ui text-ui text-book-text">
                  {t("passport:detail.summary", {
                    days: journey.totalDays,
                    destination: journey.destination,
                  })}
                </div>
              </div>

              <dl className="mt-5 space-y-3">
                <Meta
                  label={t("passport:detail.travelStyle")}
                  value={journey.travelStyle}
                />
                <Meta
                  label={t("passport:detail.remainingBudget")}
                  value={formatMinorUnits(
                    journey.remainingBudgetMinor,
                    journey.budgetCurrency,
                  )}
                />
                {journey.interests?.length > 0 && (
                  <div>
                    <dt className="font-ui text-ui-sm font-medium text-book-text-muted">
                      {t("passport:detail.interests")}
                    </dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {journey.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-panel-bg px-3 py-1 font-ui text-ui-sm text-book-text"
                        >
                          {interest}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
      </aside>

      {/* Right — the trip, one day card per day (same as the live journey) */}
      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-panel-border bg-white",
          "lg:flex",
          mobileTab === "itinerary" ? "flex" : "hidden",
        )}
      >
        <header className="flex items-center gap-3 border-b border-panel-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-journal text-title font-semibold text-book-text">
              {journey?.destination ?? t("passport:title")}
            </h2>
            {journey && (
              <p className="font-ui text-ui-sm text-book-text-muted">
                {t("passport:trips.dayProgress", {
                  current: journey.currentDay,
                  total: journey.totalDays,
                })}
              </p>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {isPending ? (
            <p className="font-ui text-ui text-book-text-muted">
              {t("passport:detail.loading")}
            </p>
          ) : isError || !journey ? (
            <div className="rounded-sm border border-error/30 bg-error/5 p-4">
              <p className="font-ui text-ui text-error">
                {t("passport:detail.loadError")}
              </p>
            </div>
          ) : days.length > 0 ? (
            <div className="flex flex-col gap-4">
              {days.map((day) => (
                <JourneyDayCard key={day.dayNumber} day={day} />
              ))}
            </div>
          ) : (
            <p className="font-ui text-ui text-book-text-muted">
              {t("passport:detail.noDays")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-ui text-ui-sm font-medium text-book-text-muted">
        {label}
      </dt>
      <dd className="font-ui text-ui text-book-text">{value}</dd>
    </div>
  );
}
