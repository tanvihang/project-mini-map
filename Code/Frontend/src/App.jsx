import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { JourneyProvider, useJourney } from "./context/JourneyContext";
import StepWizard from "./components/layout/StepWizard";
import InputStep from "./components/steps/InputStep";
import PlanningStep from "./components/steps/PlanningStep";
import OverviewStep from "./components/steps/OverviewStep";
import BudgetStep from "./components/steps/BudgetStep";
import AdjustStep from "./components/steps/AdjustStep";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import JourneysPage from "./pages/JourneysPage";
import JourneyDetailPage from "./pages/JourneyDetailPage";
import "./App.css";

function PlanPage() {
  const { state } = useJourney();

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <InputStep />;
      case 2:
        return <PlanningStep />;
      case 3:
        return <OverviewStep />;
      case 4:
        return <BudgetStep />;
      case 5:
        return <AdjustStep />;
      default:
        return <InputStep />;
    }
  };

  return <StepWizard>{renderStep()}</StepWizard>;
}

function AppContent() {
  const { state, clearUser, clearJourney } = useJourney();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    clearJourney();
    navigate("/");
  };

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo">🗺️</span>
          <h1 className="app-header__title">Mini-Map</h1>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end>
            首页
          </NavLink>
          <NavLink to="/plan">开始规划</NavLink>
          <NavLink to="/journeys">我的行程</NavLink>
          {state.user ? (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={handleLogout}
            >
              退出
            </button>
          ) : (
            <NavLink to="/auth">登录 / 注册</NavLink>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/journeys" element={<JourneysPage />} />
        <Route path="/journeys/:journeyId" element={<JourneyDetailPage />} />
      </Routes>

      <footer className="app-footer">
        <p>Mini-Map Journey Studio · Powered by AI Agent</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <JourneyProvider>
      <AppContent />
    </JourneyProvider>
  );
}

export default App;
