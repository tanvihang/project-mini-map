import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authFacade } from "@/store/auth/facade";
import { useJourneyList } from "@/hooks/useJourney";
import { tripPath } from "@/constants/routes";
import { formatMinorUnits } from "@/utils/money";
import { ChevronRightIcon, MapPinIcon } from "@/components/ui";
import type { JourneySummary } from "@/types/journey";

export function PassportScreen() {
  const { t } = useTranslation("passport");
  const navigate = useNavigate();
  const user = authFacade.user();
  const { data, isPending, isError } = useJourneyList(user?.userId ?? "");

  const trips = data?.journeys ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-journal text-display font-semibold text-book-text">
          {t("trips.title")}
        </h1>
        <p className="mt-1 font-ui text-ui text-book-text-muted">
          {t("trips.subtitle")}
        </p>
      </header>

      {isPending ? (
        <p className="font-ui text-ui text-book-text-muted">
          {t("trips.loading")}
        </p>
      ) : isError ? (
        <div className="rounded-sm border border-error/30 bg-error/5 p-4">
          <p className="font-ui text-ui text-error">{t("trips.loadError")}</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-panel-border bg-white p-8 text-center">
          <p className="font-journal text-title text-book-text">
            {t("trips.empty")}
          </p>
          <p className="mt-1 font-ui text-ui text-book-text-muted">
            {t("trips.emptyMessage")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {trips.map((trip) => (
            <li key={trip.journeyId}>
              <TripRow
                trip={trip}
                onOpen={() => navigate(tripPath(trip.journeyId))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TripRow({
  trip,
  onOpen,
}: {
  trip: JourneySummary;
  onOpen: () => void;
}) {
  const { t } = useTranslation("passport");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-2xl border border-panel-border bg-white p-4 text-left transition hover:border-primary hover:shadow-card"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-panel-bg text-book-text-muted">
        <MapPinIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-ui text-ui-lg font-semibold text-book-text">
            {trip.destination}
          </p>
          <span className="shrink-0 rounded-full bg-panel-bg px-2 py-0.5 font-ui text-ui-sm text-book-text-muted">
            {t(`status.${trip.status}`, trip.status)}
          </span>
        </div>
        <p className="mt-0.5 font-ui text-ui-sm text-book-text-muted">
          {t("trips.dayProgress", {
            current: trip.currentDay,
            total: trip.totalDays,
          })}
          {" · "}
          {formatMinorUnits(trip.totalBudgetMinor, trip.budgetCurrency)}
        </p>
      </div>

      <ChevronRightIcon className="h-5 w-5 shrink-0 text-book-text-muted" />
    </button>
  );
}
