import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGateway } from "../hooks/useGateway";
import MapView from "../components/shared/MapView";
import DayCard from "../components/shared/DayCard";
import "./JourneyDetailPage.css";

export default function JourneyDetailPage() {
  const { journeyId } = useParams();
  const { getJourney } = useGateway();
  const [journey, setJourney] = useState(null);
  const [error, setError] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!journeyId) return;
      const result = await getJourney(journeyId);
      if (result.success) {
        setJourney(result.journey);
        setExpandedDay((result.journey?.days || []).length - 1);
      } else {
        setError(result.message || "加载行程失败");
      }
    };
    load();
  }, [journeyId, getJourney]);

  const days = useMemo(() => journey?.days || [], [journey]);
  const waypoints = useMemo(() => journey?.waypoints || [], [journey]);
  const startLocation = useMemo(() => {
    if (journey?.startLocation) {
      return {
        name: journey.startLocationName,
        coordinates: journey.startLocation?.coordinates,
      };
    }
    return null;
  }, [journey]);

  if (error) {
    return (
      <div className="journey-detail__status">
        <p>{error}</p>
        <Link className="btn btn--ghost" to="/journeys">
          返回列表
        </Link>
      </div>
    );
  }

  if (!journey) {
    return <p className="journey-detail__status">加载中...</p>;
  }

  return (
    <div className="journey-detail">
      <header className="journey-detail__header">
        <div>
          <p className="journey-detail__eyebrow">行程详情</p>
          <h1>{journey.destination}</h1>
          <p>
            {journey.totalDays} 天 · 预算 {journey.budgetCurrency}{" "}
            {Number(journey.totalBudgetMinor || 0).toLocaleString()}
          </p>
        </div>
        <Link className="btn btn--ghost" to="/journeys">
          返回列表
        </Link>
      </header>

      <section className="journey-detail__map">
        <MapView
          days={days}
          waypoints={waypoints}
          startLocation={startLocation}
        />
      </section>

      <section className="journey-detail__timeline">
        <h2>行程时间线</h2>
        <div className="journey-detail__list">
          {days.map((day, index) => (
            <DayCard
              key={`journey-day-${day.dayNumber}-${index}`}
              day={day}
              isExpanded={expandedDay === index}
              onToggle={() =>
                setExpandedDay(expandedDay === index ? null : index)
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
