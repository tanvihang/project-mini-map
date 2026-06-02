import { useState } from "react";
import { useJourney } from "../../context/JourneyContext";
import { useGateway } from "../../hooks/useGateway";
import "./AdjustStep.css";

export default function AdjustStep() {
  const { state, setParams, updateParam, setStep, clearJourney } = useJourney();
  const { startJourney, sendChat } = useGateway();

  // Local state for adjustments
  const [adjustments, setAdjustments] = useState({
    totalDays: state.params.totalDays,
    totalBudgetMinor: state.params.totalBudgetMinor,
    budgetCurrency: state.params.budgetCurrency,
    travelStyle: state.params.travelStyle,
    interests: state.params.interests.join(", "),
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState("");

  // Travel styles
  const travelStyles = [
    { value: "slow", label: "慢节奏", desc: "深度体验，悠闲漫步" },
    { value: "balanced", label: "均衡", desc: "景点与休闲兼顾" },
    { value: "intensive", label: "紧凑", desc: "高效打卡，行程充实" },
  ];

  // Handle input change
  const handleInputChange = (key, value) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  // Handle interests change
  const handleInterestsChange = (e) => {
    const value = e.target.value;
    setAdjustments((prev) => ({ ...prev, interests: value }));
  };

  // Apply changes and re-plan
  const handleReplan = async () => {
    // Update global params
    const interests = adjustments.interests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setParams({
      totalDays: Number(adjustments.totalDays),
      totalBudgetMinor: adjustments.totalBudgetMinor,
      budgetCurrency: adjustments.budgetCurrency,
      travelStyle: adjustments.travelStyle,
      interests,
    });

    // Clear existing journey and restart
    clearJourney();

    // Go to planning step
    setStep(2);

    // Start new journey
    setTimeout(async () => {
      const result = await startJourney();
      if (result.success) {
        setStep(3);
      }
    }, 500);
  };

  // Handle chat send
  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: chatInput,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const result = await sendChat(chatInput, chatSessionId || null);

      if (result.success) {
        setChatSessionId(result.sessionId);
        const assistantMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.reply,
          suggestedActions: result.suggestedActions || [],
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "抱歉，处理您的请求时出现问题。请稍后再试。",
          },
        ]);
      }
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `错误: ${error.message}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle chat key down
  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  };

  // Format budget for display
  const formatBudget = (minor) => {
    const value = parseInt(minor, 10);
    if (isNaN(value)) return "0";
    return value.toLocaleString();
  };

  return (
    <div className="adjust-step">
      {/* Header */}
      <header className="adjust-header">
        <h1>调整方案</h1>
        <p>修改参数后重新规划行程</p>
      </header>

      <div className="adjust-content">
        {/* Parameters Section */}
        <section className="adjust-params">
          <h2>行程参数</h2>

          <div className="param-group">
            <label className="param-field">
              <span className="param-field__label">旅行天数</span>
              <input
                type="number"
                min="1"
                max="14"
                value={adjustments.totalDays}
                onChange={(e) => handleInputChange("totalDays", parseInt(e.target.value, 10) || 1)}
              />
            </label>

            <label className="param-field">
              <span className="param-field__label">预算金额</span>
              <div className="param-field__row">
                <input
                  type="text"
                  value={formatBudget(adjustments.totalBudgetMinor)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    handleInputChange("totalBudgetMinor", value || "0");
                  }}
                />
                <select
                  value={adjustments.budgetCurrency}
                  onChange={(e) => handleInputChange("budgetCurrency", e.target.value)}
                >
                  <option value="JPY">JPY</option>
                  <option value="USD">USD</option>
                  <option value="CNY">CNY</option>
                  <option value="MYR">MYR</option>
                  <option value="EUR">EUR</option>
                  <option value="KRW">KRW</option>
                  <option value="THB">THB</option>
                </select>
              </div>
            </label>
          </div>

          <div className="param-group">
            <label className="param-field param-field--full">
              <span className="param-field__label">旅行风格</span>
              <div className="style-options">
                {travelStyles.map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    className={`style-option ${
                      adjustments.travelStyle === style.value ? "style-option--active" : ""
                    }`}
                    onClick={() => handleInputChange("travelStyle", style.value)}
                  >
                    <span className="style-option__label">{style.label}</span>
                    <span className="style-option__desc">{style.desc}</span>
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="param-group">
            <label className="param-field param-field--full">
              <span className="param-field__label">兴趣爱好</span>
              <input
                type="text"
                value={adjustments.interests}
                onChange={handleInterestsChange}
                placeholder="寺庙、咖啡、摄影、美食...（逗号分隔）"
              />
            </label>
          </div>

          <div className="param-actions">
            <button
              className="btn btn--primary btn--large"
              onClick={handleReplan}
              disabled={state.loading}
            >
              {state.loading ? (
                <>
                  <span className="btn__spinner"></span>
                  重新规划中...
                </>
              ) : (
                "重新规划"
              )}
            </button>
          </div>
        </section>

        {/* Chat Assistant Section */}
        <section className="adjust-chat">
          <h2>旅行助手</h2>
          <p className="adjust-chat__hint">
            与 AI 助手对话，获取行程建议和调整方案
          </p>

          <div className="chat-container">
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <p>开始对话，询问关于您旅程的问题</p>
                  <div className="chat-suggestions">
                    <button onClick={() => setChatInput("如何节省预算？")}>
                      如何节省预算？
                    </button>
                    <button onClick={() => setChatInput("推荐更多景点")}>
                      推荐更多景点
                    </button>
                    <button onClick={() => setChatInput("调整行程节奏")}>
                      调整行程节奏
                    </button>
                  </div>
                </div>
              )}

              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message chat-message--${msg.role}`}
                >
                  <div className="chat-bubble">
                    <p>{msg.content}</p>
                    {msg.suggestedActions?.length > 0 && (
                      <div className="chat-actions">
                        {msg.suggestedActions.map((action, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="chat-action-btn"
                            onClick={() => setChatInput(action)}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="chat-message chat-message--assistant">
                  <div className="chat-bubble chat-bubble--loading">
                    <span className="dot dot--pulse"></span>
                    <span className="dot dot--pulse"></span>
                    <span className="dot dot--pulse"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="chat-input-area">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="输入您的问题..."
                rows={2}
                disabled={chatLoading}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
              >
                发送
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}