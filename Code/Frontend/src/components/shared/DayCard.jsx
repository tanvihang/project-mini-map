import "./DayCard.css";

export default function DayCard({ day, isExpanded, onToggle }) {
  if (!day) return null;

  // Format money
  const formatMoney = (minor, currency) => {
    if (!minor || !currency) return "-";
    const value = Number(minor);
    if (isNaN(value)) return "-";
    return `${currency} ${value.toLocaleString()}`;
  };

  return (
    <article className={`day-card ${isExpanded ? "day-card--expanded" : ""}`}>
      {/* Header - always visible */}
      <button className="day-card__header" onClick={onToggle} type="button">
        <div className="day-card__badge">Day {day.dayNumber}</div>
        <div className="day-card__main">
          <h3 className="day-card__title">{day.title}</h3>
          <p className="day-card__meta">
            {day.time && <span>{day.time}</span>}
            {day.location?.name && <span>{day.location.name}</span>}
            {day.price?.minor && (
              <span>{formatMoney(day.price.minor, day.price.currency)}</span>
            )}
          </p>
        </div>
        <span className="day-card__toggle">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="day-card__content">
          {/* Story */}
          {day.story && (
            <div className="day-card__section">
              <p className="day-card__story">{day.story}</p>
            </div>
          )}

          {/* Location & Weather */}
          <div className="day-card__grid">
            <div className="day-card__panel">
              <h4>位置</h4>
              <p>{day.location?.name}</p>
              {day.location?.address && (
                <p className="day-card__sub">{day.location.address}</p>
              )}
            </div>
            <div className="day-card__panel">
              <h4>天气</h4>
              {day.weather?.condition && <p>{day.weather.condition}</p>}
              {day.weather?.tempC !== undefined && (
                <p className="day-card__sub">{day.weather.tempC}°C</p>
              )}
            </div>
          </div>

          {/* Senses */}
          {day.senses && Object.values(day.senses).some(Boolean) && (
            <div className="day-card__section">
              <h4>五感记录</h4>
              <ul className="senses-list">
                {day.senses.see && <li>👁️ 视觉：{day.senses.see}</li>}
                {day.senses.hear && <li>👂 听觉：{day.senses.hear}</li>}
                {day.senses.smell && <li>👃 嗅觉：{day.senses.smell}</li>}
                {day.senses.taste && <li>👅 味觉：{day.senses.taste}</li>}
                {day.senses.touch && <li>✋ 触感：{day.senses.touch}</li>}
                {day.senses.mood && <li>💭 情绪：{day.senses.mood}</li>}
              </ul>
            </div>
          )}

          {/* Culture */}
          {day.culture && (
            <div className="day-card__section">
              <h4>文化提示</h4>
              {day.culture.cultureTips?.length > 0 && (
                <ul className="tips-list">
                  {day.culture.cultureTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              )}
              {day.culture.localPhrase && (
                <div className="phrase-box">
                  <p className="phrase">"{day.culture.localPhrase.phrase}"</p>
                  {day.culture.localPhrase.pronunciation && (
                    <p className="pronunciation">
                      {day.culture.localPhrase.pronunciation}
                    </p>
                  )}
                  {day.culture.localPhrase.meaning && (
                    <p className="meaning">{day.culture.localPhrase.meaning}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dialogues */}
          {day.dialogues?.length > 0 && (
            <div className="day-card__section">
              <h4>对话片段</h4>
              <div className="dialogues">
                {day.dialogues.map((dialogue, idx) => (
                  <div key={idx} className="dialogue">
                    <p className="dialogue__speaker">{dialogue.speaker}</p>
                    <p className="dialogue__text">{dialogue.text}</p>
                    {dialogue.translation && (
                      <p className="dialogue__translation">
                        {dialogue.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Practical */}
          {day.practical && (
            <div className="day-card__section">
              <h4>实用信息</h4>
              <div className="practical-grid">
                {day.practical.openingHours && (
                  <div>
                    <span className="practical-label">营业时间</span>
                    <span>{day.practical.openingHours}</span>
                  </div>
                )}
                {day.practical.crowdLevel && (
                  <div>
                    <span className="practical-label">人流密度</span>
                    <span>{day.practical.crowdLevel}</span>
                  </div>
                )}
                {day.practical.bestTimeToVisit && (
                  <div>
                    <span className="practical-label">最佳时间</span>
                    <span>{day.practical.bestTimeToVisit}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}