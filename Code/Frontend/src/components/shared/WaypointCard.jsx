import "./WaypointCard.css";

export default function WaypointCard({ waypoint, index, onRemove }) {
  if (!waypoint) return null;

  const typeLabel = waypoint.type === "auto" ? "推荐" : "自选";
  const typeClass = waypoint.type === "auto" ? "waypoint-card--auto" : "waypoint-card--manual";

  return (
    <div className={`waypoint-card ${typeClass}`}>
      <div className="waypoint-card__header">
        <span className="waypoint-card__badge">{typeLabel}</span>
        <h4 className="waypoint-card__name">{waypoint.name}</h4>
      </div>

      {waypoint.betweenDays && (
        <p className="waypoint-card__between">
          Day {waypoint.betweenDays[0]} → Day {waypoint.betweenDays[1]}
        </p>
      )}

      <div className="waypoint-card__actions">
        {onRemove && (
          <button
            type="button"
            className="waypoint-card__remove"
            onClick={() => onRemove(index)}
            title="移除此途经点"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}