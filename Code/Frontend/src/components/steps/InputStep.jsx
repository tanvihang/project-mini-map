import { useState } from "react";
import { Link } from "react-router-dom";
import { useJourney } from "../../context/JourneyContext";
import { useGateway } from "../../hooks/useGateway";
import "./InputStep.css";

export default function InputStep() {
  const { state, setParams, updateParam, nextStep } = useJourney();
  const { startJourney } = useGateway();
  const [interestsInput, setInterestsInput] = useState(
    state.params.interests.join(", "),
  );
  const [startLocationInput, setStartLocationInput] = useState(
    state.params.startLocation?.name || "",
  );
  const [locating, setLocating] = useState(false);

  // Currency options
  const currencies = [
    { code: "JPY", symbol: "¥", name: "日元" },
    { code: "USD", symbol: "$", name: "美元" },
    { code: "CNY", symbol: "¥", name: "人民币" },
    { code: "MYR", symbol: "RM", name: "马币" },
    { code: "EUR", symbol: "€", name: "欧元" },
    { code: "KRW", symbol: "₩", name: "韩元" },
    { code: "THB", symbol: "฿", name: "泰铢" },
    { code: "VND", symbol: "₫", name: "越南盾" },
  ];

  // Travel styles
  const travelStyles = [
    { value: "slow", label: "慢节奏", desc: "深度体验，悠闲漫步" },
    { value: "balanced", label: "均衡", desc: "景点与休闲兼顾" },
    { value: "intensive", label: "紧凑", desc: "高效打卡，行程充实" },
  ];

  // Handle interests change
  const handleInterestsChange = (e) => {
    const value = e.target.value;
    setInterestsInput(value);
    const interests = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setParams({ interests });
  };

  // Handle start location input change
  const handleStartLocationChange = (e) => {
    const value = e.target.value;
    setStartLocationInput(value);
    if (value.trim()) {
      // Store the name, coordinates will be resolved by backend
      setParams({
        startLocation: {
          name: value.trim(),
          coordinates: null, // Will be geocoded by backend
        },
      });
    } else {
      setParams({ startLocation: null });
    }
  };

  // Handle use current location
  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("您的浏览器不支持定位功能");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coordinates = [pos.coords.longitude, pos.coords.latitude];
        setParams({
          startLocation: {
            name: "当前位置",
            coordinates,
          },
        });
        setStartLocationInput("当前位置");
        setLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert("无法获取当前位置，请手动输入");
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  // Handle start planning
  const handleStartPlanning = async () => {
    if (!state.user) {
      alert("请先登录后再开始规划");
      return;
    }
    if (!state.params.destination.trim()) {
      alert("请输入目的地");
      return;
    }

    const result = await startJourney();

    if (result.success) {
      nextStep(); // Go to PlanningStep (will auto-advance)
      // Short delay then go to OverviewStep
      setTimeout(() => {
        nextStep();
      }, 1500);
    } else {
      alert(result.message || "启动规划失败");
    }
  };

  // Format budget for display
  const formatBudget = (minor) => {
    const value = parseInt(minor, 10);
    if (isNaN(value)) return "0";
    return value.toLocaleString();
  };

  return (
    <div className="input-step">
      {!state.user && (
        <section className="input-section input-section--notice">
          <div className="input-section__header">
            <h2>请先登录</h2>
            <p>行程会保存到您的账号中，方便稍后查看。</p>
          </div>
          <Link className="btn btn--secondary" to="/auth">
            前往登录 / 注册
          </Link>
        </section>
      )}

      {/* Journey Parameters Section */}
      <section className="input-section">
        <div className="input-section__header">
          <h2>行程参数</h2>
          <p>告诉我们您的旅行偏好</p>
        </div>

        <div className="form-row">
          <label className="form-field form-field--full">
            目的地
            <input
              type="text"
              value={state.params.destination}
              onChange={(e) => updateParam("destination", e.target.value)}
              placeholder="例如：京都、巴黎、纽约..."
            />
          </label>
        </div>

        {/* 起始地点输入 */}
        <div className="form-row">
          <label className="form-field form-field--full">
            起始地点
            <div className="start-location-input">
              <input
                type="text"
                value={startLocationInput}
                onChange={handleStartLocationChange}
                placeholder="输入出发城市或地址..."
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={handleUseCurrentLocation}
                disabled={locating}
              >
                {locating ? "定位中..." : "使用当前位置"}
              </button>
            </div>
            <span className="form-hint">
              {state.params.startLocation
                ? `已选择: ${state.params.startLocation.name}`
                : "留空则使用当前位置"}
            </span>
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            旅行天数
            <input
              type="number"
              min="1"
              max="14"
              value={state.params.totalDays}
              onChange={(e) =>
                updateParam("totalDays", parseInt(e.target.value, 10) || 1)
              }
            />
          </label>
          <label className="form-field">
            预算金额
            <div className="budget-input">
              <input
                type="text"
                value={formatBudget(state.params.totalBudgetMinor)}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  updateParam("totalBudgetMinor", value || "0");
                }}
              />
              <select
                value={state.params.budgetCurrency}
                onChange={(e) => updateParam("budgetCurrency", e.target.value)}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="form-row">
          <label className="form-field form-field--full">
            旅行风格
            <div className="style-options">
              {travelStyles.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  className={`style-option ${
                    state.params.travelStyle === style.value
                      ? "style-option--active"
                      : ""
                  }`}
                  onClick={() => updateParam("travelStyle", style.value)}
                >
                  <span className="style-option__label">{style.label}</span>
                  <span className="style-option__desc">{style.desc}</span>
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="form-row">
          <label className="form-field form-field--full">
            兴趣爱好
            <input
              type="text"
              value={interestsInput}
              onChange={handleInterestsChange}
              placeholder="寺庙、咖啡、摄影、美食...（逗号分隔）"
            />
            <span className="form-hint">
              {state.params.interests.length > 0
                ? `已选择 ${state.params.interests.length} 个兴趣`
                : "输入兴趣关键词，用逗号分隔"}
            </span>
          </label>
        </div>
      </section>

      {/* Start Button */}
      <div className="input-actions">
        <button
          type="button"
          className="btn btn--primary btn--large"
          onClick={handleStartPlanning}
          disabled={state.loading || !state.params.destination.trim()}
        >
          {state.loading ? (
            <>
              <span className="btn__spinner"></span>
              规划中...
            </>
          ) : (
            "开始规划"
          )}
        </button>
        <p className="input-actions__hint">
          Agent 将根据您的需求生成个性化行程
        </p>
      </div>
    </div>
  );
}
