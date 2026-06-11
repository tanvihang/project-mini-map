import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useJourney } from "../context/JourneyContext";
import { useGateway } from "../hooks/useGateway";
import "./JourneysPage.css";

export default function JourneysPage() {
  const { state } = useJourney();
  const { listJourneys } = useGateway();
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadJourneys = async () => {
      if (!state.user?.userId) return;
      setLoading(true);
      setError(null);
      const result = await listJourneys(state.user.userId);
      if (result.success) {
        setJourneys(result.journeys || []);
      } else {
        setError(result.message || "加载行程失败");
      }
      setLoading(false);
    };

    loadJourneys();
  }, [state.user, listJourneys]);

  if (!state.user) {
    return (
      <div className="journeys-empty">
        <h2>请先登录</h2>
        <p>登录后可查看已规划的行程。</p>
        <Link className="btn btn--secondary" to="/auth">
          前往登录
        </Link>
      </div>
    );
  }

  return (
    <div className="journeys">
      <header className="journeys-header">
        <div>
          <h1>我的行程</h1>
          <p>所有规划记录都在这里，随时查看与继续。</p>
        </div>
        <Link className="btn btn--primary" to="/plan">
          新建行程
        </Link>
      </header>

      {loading && <p className="journeys-status">加载中...</p>}
      {error && (
        <p className="journeys-status journeys-status--error">{error}</p>
      )}

      {!loading && journeys.length === 0 && (
        <div className="journeys-empty">
          <p>还没有行程，先创建一个吧。</p>
          <Link className="btn btn--ghost" to="/plan">
            立即规划
          </Link>
        </div>
      )}

      <div className="journeys-grid">
        {journeys.map((journey) => (
          <article className="journey-card" key={journey.journeyId}>
            <div className="journey-card__meta">
              <span className="journey-card__badge">
                {journey.status || "active"}
              </span>
              <span className="journey-card__date">
                {new Date(journey.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3>{journey.destination}</h3>
            <p>
              {journey.totalDays} 天 · 预算 {journey.budgetCurrency}{" "}
              {Number(journey.totalBudgetMinor || 0).toLocaleString()}
            </p>
            <div className="journey-card__actions">
              <Link
                className="btn btn--ghost"
                to={`/journeys/${journey.journeyId}`}
              >
                查看详情
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
