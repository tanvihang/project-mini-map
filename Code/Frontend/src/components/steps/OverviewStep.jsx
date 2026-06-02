import { useState, useEffect } from "react";
import { useJourney } from "../../context/JourneyContext";
import { useGateway } from "../../hooks/useGateway";
import MapView from "../shared/MapView";
import DayCard from "../shared/DayCard";
import ChoiceCard from "../shared/ChoiceCard";
import WaypointCard from "../shared/WaypointCard";
import WaypointDialog from "../shared/WaypointDialog";
import "./OverviewStep.css";

export default function OverviewStep() {
  const { state, nextStep, setChoices, addDay, addWaypoint, removeWaypoint } = useJourney();
  const { nextDay } = useGateway();
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);
  const [isWaypointDialogOpen, setIsWaypointDialogOpen] = useState(false);

  // Days from journey
  const days = state.journey.days;
  const choices = state.journey.choices || [];
  const currentDay = state.journey.currentDay;
  const waypoints = state.journey.waypoints || [];
  const startLocation = state.params.startLocation;

  // Handle next day generation
  const handleNextDay = async () => {
    if (currentDay >= state.params.totalDays) {
      // Journey complete, go to budget check
      nextStep();
      return;
    }

    const result = await nextDay(selectedChoice);
    if (result.success) {
      setSelectedChoice(0);
    } else {
      alert(result.message || "生成下一天失败");
    }
  };

  // Handle complete journey
  const handleComplete = () => {
    nextStep();
  };

  // Handle add waypoint
  const handleAddWaypoint = (waypoint) => {
    addWaypoint(waypoint);
  };

  // Handle remove waypoint
  const handleRemoveWaypoint = (index) => {
    removeWaypoint(index);
  };

  // Auto-expand latest day
  useEffect(() => {
    if (days.length > 0) {
      setExpandedDay(days.length - 1);
    }
  }, [days.length]);

  // Format money
  const formatMoney = (minor, currency) => {
    if (!minor || !currency) return "-";
    const value = Number(minor);
    if (isNaN(value)) return "-";
    return `${currency} ${value.toLocaleString()}`;
  };

  return (
    <div className="overview-step">
      {/* Header */}
      <header className="overview-header">
        <div className="overview-header__info">
          <h1>{state.params.destination}</h1>
          <p>
            {state.params.totalDays} 天行程 ·
            预算 {formatMoney(state.params.totalBudgetMinor, state.params.budgetCurrency)}
          </p>
          {startLocation && (
            <p className="overview-header__start">
              起点: {startLocation.name || "当前位置"}
            </p>
          )}
        </div>
        <div className="overview-header__status">
          <span className="status-badge">
            Day {currentDay} / {state.params.totalDays}
          </span>
        </div>
      </header>

      <div className="overview-content">
        {/* Map Section */}
        <section className="overview-map">
          <MapView
            days={days}
            waypoints={waypoints}
            startLocation={startLocation}
          />
        </section>

        {/* Waypoints Section */}
        <section className="overview-waypoints">
          <h2 className="section-title">途经景点</h2>

          {waypoints.length > 0 ? (
            <div className="waypoints-list">
              {waypoints.map((wp, index) => (
                <WaypointCard
                  key={`waypoint-${index}`}
                  waypoint={wp}
                  index={index}
                  onRemove={handleRemoveWaypoint}
                />
              ))}
            </div>
          ) : (
            <p className="waypoints-empty">暂无途经景点，点击下方按钮添加</p>
          )}

          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setIsWaypointDialogOpen(true)}
          >
            + 添加途经景点
          </button>
        </section>

        {/* Timeline Section */}
        <section className="overview-timeline">
          <h2 className="section-title">行程时间线</h2>

          {days.length === 0 ? (
            <div className="timeline-empty">
              <p>暂无行程数据</p>
            </div>
          ) : (
            <div className="timeline-list">
              {days.map((day, index) => (
                <DayCard
                  key={`day-${day.dayNumber}-${index}`}
                  day={day}
                  isExpanded={expandedDay === index}
                  onToggle={() => setExpandedDay(expandedDay === index ? null : index)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Choices Section */}
        {choices.length > 0 && currentDay < state.params.totalDays && (
          <section className="overview-choices">
            <h2 className="section-title">
              选择 Day {currentDay + 1} 的方向
            </h2>
            <div className="choices-grid">
              {choices.map((choice, index) => (
                <ChoiceCard
                  key={`choice-${index}`}
                  choice={choice}
                  isSelected={selectedChoice === index}
                  onClick={() => setSelectedChoice(index)}
                />
              ))}
            </div>
            <div className="choices-actions">
              <button
                className="btn btn--primary"
                onClick={handleNextDay}
                disabled={state.loading}
              >
                {state.loading ? "生成中..." : `生成 Day ${currentDay + 1}`}
              </button>
            </div>
          </section>
        )}

        {/* Complete Section */}
        {currentDay >= state.params.totalDays && (
          <section className="overview-complete">
            <div className="complete-card">
              <div className="complete-card__icon">🎉</div>
              <h3>行程规划完成！</h3>
              <p>共 {days.length} 天，已生成完整行程</p>
              <button className="btn btn--primary btn--large" onClick={handleComplete}>
                查看预算报告
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Waypoint Dialog */}
      <WaypointDialog
        isOpen={isWaypointDialogOpen}
        onClose={() => setIsWaypointDialogOpen(false)}
        onAdd={handleAddWaypoint}
        days={days}
      />
    </div>
  );
}