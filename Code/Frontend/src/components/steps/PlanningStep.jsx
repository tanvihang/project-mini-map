import { useEffect, useState } from "react";
import { useJourney } from "../../context/JourneyContext";
import "./PlanningStep.css";

export default function PlanningStep() {
  const { state, nextStep } = useJourney();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("初始化 Agent...");

  useEffect(() => {
    // Simulate progress animation
    const steps = [
      { progress: 20, text: "分析目的地信息..." },
      { progress: 40, text: "查询可达景点..." },
      { progress: 60, text: "计算预算分配..." },
      { progress: 80, text: "生成行程方案..." },
      { progress: 100, text: "完成规划！" },
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < steps.length) {
        setProgress(steps[currentIndex].progress);
        setStatusText(steps[currentIndex].text);
        currentIndex++;
      } else {
        clearInterval(interval);
        // Auto advance to next step after a short delay
        setTimeout(() => {
          nextStep();
        }, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [nextStep]);

  // Get current day data if available
  const currentDay = state.journey.days[0];

  return (
    <div className="planning-step">
      <div className="planning-card">
        {/* Animated icon */}
        <div className="planning-icon">
          <div className="planning-icon__pulse"></div>
          <div className="planning-icon__core">🤖</div>
        </div>

        {/* Status text */}
        <h2 className="planning-title">{statusText}</h2>

        {/* Progress bar */}
        <div className="planning-progress">
          <div
            className="planning-progress__bar"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Destination info */}
        <div className="planning-info">
          <div className="planning-info__item">
            <span className="planning-info__label">起点</span>
            <span className="planning-info__value">
              {state.params.startLocation?.name || "当前位置"}
            </span>
          </div>
          <div className="planning-info__item">
            <span className="planning-info__label">目的地</span>
            <span className="planning-info__value">{state.params.destination}</span>
          </div>
          <div className="planning-info__item">
            <span className="planning-info__label">天数</span>
            <span className="planning-info__value">{state.params.totalDays} 天</span>
          </div>
          <div className="planning-info__item">
            <span className="planning-info__label">预算</span>
            <span className="planning-info__value">
              {parseInt(state.params.totalBudgetMinor).toLocaleString()} {state.params.budgetCurrency}
            </span>
          </div>
        </div>

        {/* Show preview if day data is available */}
        {currentDay && (
          <div className="planning-preview">
            <p className="planning-preview__label">Day {currentDay.dayNumber}</p>
            <p className="planning-preview__title">{currentDay.title}</p>
          </div>
        )}
      </div>

      {/* Background decoration */}
      <div className="planning-bg">
        <div className="planning-bg__dot"></div>
        <div className="planning-bg__dot"></div>
        <div className="planning-bg__dot"></div>
      </div>
    </div>
  );
}