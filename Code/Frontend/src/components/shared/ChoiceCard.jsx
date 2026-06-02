import "./ChoiceCard.css";

export default function ChoiceCard({ choice, isSelected, onClick }) {
  if (!choice) return null;

  // Format money
  const formatMoney = (minor, currency) => {
    if (!minor || !currency) return "-";
    const value = Number(minor);
    if (isNaN(value)) return "-";
    return `~${currency} ${value.toLocaleString()}`;
  };

  // Type icons
  const typeIcons = {
    move: "🚶",
    activity: "🎯",
    explore: "🔍",
    slow: "☕",
  };

  return (
    <button
      className={`choice-card ${isSelected ? "choice-card--selected" : ""}`}
      onClick={onClick}
      type="button"
    >
      {/* Selection indicator */}
      <div className="choice-card__select">
        <span className="choice-card__check">{isSelected ? "✓" : ""}</span>
      </div>

      {/* Type badge */}
      <div className="choice-card__type">
        <span className="choice-card__type-icon">
          {typeIcons[choice.type] || "📍"}
        </span>
        <span className="choice-card__type-label">{choice.type}</span>
      </div>

      {/* Content */}
      <div className="choice-card__content">
        <h4 className="choice-card__title">{choice.title}</h4>
        <p className="choice-card__desc">{choice.description}</p>
      </div>

      {/* Meta */}
      <div className="choice-card__meta">
        {choice.destinationName && (
          <span className="choice-card__location">{choice.destinationName}</span>
        )}
        {choice.estimatedCostMinor && (
          <span className="choice-card__cost">
            {formatMoney(choice.estimatedCostMinor, choice.currency)}
          </span>
        )}
      </div>

      {/* Tags */}
      {choice.tags?.length > 0 && (
        <div className="choice-card__tags">
          {choice.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="choice-card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Recommended badge */}
      {choice.isRecommended && (
        <div className="choice-card__recommended">推荐</div>
      )}
    </button>
  );
}