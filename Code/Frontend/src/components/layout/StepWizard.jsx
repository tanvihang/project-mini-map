import { useJourney } from "../../context/JourneyContext";
import "./StepWizard.css";

const STEP_LABELS = [
  { num: 1, label: "需求输入", icon: "📝" },
  { num: 2, label: "Agent 规划", icon: "🤖" },
  { num: 3, label: "行程展示", icon: "🗺️" },
  { num: 4, label: "预算检查", icon: "💰" },
  { num: 5, label: "调整方案", icon: "🔄" },
];

export default function StepWizard({ children }) {
  const { state, setStep } = useJourney();
  const currentStep = state.step;

  return (
    <div className="step-wizard">
      {/* Progress indicator */}
      <nav className="step-progress">
        {STEP_LABELS.map((step, index) => (
          <div key={step.num} className="step-progress__item-wrapper">
            <button
              className={`step-progress__item ${
                currentStep === step.num
                  ? "step-progress__item--active"
                  : currentStep > step.num
                  ? "step-progress__item--completed"
                  : ""
              }`}
              onClick={() => {
                // Only allow going back to completed steps
                if (currentStep > step.num) {
                  setStep(step.num);
                }
              }}
              disabled={currentStep < step.num}
            >
              <span className="step-progress__icon">{step.icon}</span>
              <span className="step-progress__label">{step.label}</span>
              <span className="step-progress__num">{step.num}</span>
            </button>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`step-progress__connector ${
                  currentStep > step.num ? "step-progress__connector--completed" : ""
                }`}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Step content */}
      <main className="step-content">
        {children}
      </main>
    </div>
  );
}