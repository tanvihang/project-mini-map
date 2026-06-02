import { useState } from "react";
import "./WaypointDialog.css";

export default function WaypointDialog({ isOpen, onClose, onAdd, days }) {
  const [name, setName] = useState("");
  const [coordinates, setCoordinates] = useState({ lng: "", lat: "" });
  const [betweenDays, setBetweenDays] = useState({ from: 1, to: 2 });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("请输入途经景点名称");
      return;
    }
    const lng = parseFloat(coordinates.lng);
    const lat = parseFloat(coordinates.lat);
    if (isNaN(lng) || isNaN(lat)) {
      alert("请输入有效的经纬度");
      return;
    }

    onAdd({
      name: name.trim(),
      coordinates: [lng, lat],
      betweenDays: [betweenDays.from, betweenDays.to],
      type: "manual",
    });

    // Reset form
    setName("");
    setCoordinates({ lng: "", lat: "" });
    onClose();
  };

  const handleUseDayLocation = (dayIndex) => {
    const day = days[dayIndex];
    if (day?.location?.coordinates) {
      setCoordinates({
        lng: day.location.coordinates[0].toString(),
        lat: day.location.coordinates[1].toString(),
      });
      setName(day.location.name || "");
    }
  };

  return (
    <div className="waypoint-dialog-overlay" onClick={onClose}>
      <div className="waypoint-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="waypoint-dialog__header">
          <h3>添加途经景点</h3>
          <button
            type="button"
            className="waypoint-dialog__close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="waypoint-dialog__form">
          {/* Quick pick from existing days */}
          {days.length > 0 && (
            <div className="waypoint-dialog__field">
              <label>快速选择已有地点</label>
              <div className="waypoint-dialog__quick-pick">
                {days.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    className="waypoint-dialog__quick-btn"
                    onClick={() => handleUseDayLocation(index)}
                  >
                    Day {day.dayNumber}: {day.location?.name || day.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="waypoint-dialog__field">
            <label htmlFor="waypoint-name">景点名称</label>
            <input
              id="waypoint-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入景点名称..."
            />
          </div>

          <div className="waypoint-dialog__row">
            <div className="waypoint-dialog__field">
              <label htmlFor="waypoint-lng">经度</label>
              <input
                id="waypoint-lng"
                type="text"
                value={coordinates.lng}
                onChange={(e) =>
                  setCoordinates({ ...coordinates, lng: e.target.value })
                }
                placeholder="例如: 135.7681"
              />
            </div>
            <div className="waypoint-dialog__field">
              <label htmlFor="waypoint-lat">纬度</label>
              <input
                id="waypoint-lat"
                type="text"
                value={coordinates.lat}
                onChange={(e) =>
                  setCoordinates({ ...coordinates, lat: e.target.value })
                }
                placeholder="例如: 35.0116"
              />
            </div>
          </div>

          <div className="waypoint-dialog__row">
            <div className="waypoint-dialog__field">
              <label htmlFor="waypoint-from">从 Day</label>
              <input
                id="waypoint-from"
                type="number"
                min="1"
                max={days.length}
                value={betweenDays.from}
                onChange={(e) =>
                  setBetweenDays({
                    ...betweenDays,
                    from: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>
            <div className="waypoint-dialog__field">
              <label htmlFor="waypoint-to">到 Day</label>
              <input
                id="waypoint-to"
                type="number"
                min="2"
                max={days.length + 1}
                value={betweenDays.to}
                onChange={(e) =>
                  setBetweenDays({
                    ...betweenDays,
                    to: parseInt(e.target.value, 10) || 2,
                  })
                }
              />
            </div>
          </div>

          <div className="waypoint-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
            >
              取消
            </button>
            <button type="submit" className="btn btn--primary">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}