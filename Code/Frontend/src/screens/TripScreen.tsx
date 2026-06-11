import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGetJourney } from "@/hooks/useJourney";
import { ROUTES } from "@/constants/routes";
import { JourneyDayCard } from "@/components/book";
import { ChevronLeftIcon } from "@/components/ui";
import { formatMinorUnits } from "@/utils/money";

export function TripScreen() {
  const { journeyId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation(["passport", "journey"]);
  const { data, isPending, isError } = useGetJourney(journeyId);

  const journey = data?.journey;
  const days = journey?.days ?? [];

  const goBack = () => navigate(ROUTES.PASSPORT);

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] w-full max-w-7xl gap-4 px-4 py-4">
      {/* Left — trip summary, mirroring the journey chat panel */}
      <aside className="flex w-full max-w-sm shrink-0 flex-col rounded-2xl border border-panel-border bg-white">
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
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-panel-border bg-white">
        <header className="flex items-center gap-3 border-b border-panel-border px-5 py-4">
          <button
            type="button"
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-panel-border text-book-text transition hover:bg-panel-bg"
            aria-label={t("passport:detail.back")}
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-journal text-title font-semibold text-book-text">
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
