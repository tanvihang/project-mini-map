import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useJourney } from "../../context/JourneyContext";
import "./BudgetStep.css";

const COLORS = ["#d0683b", "#e8a87c", "#f5d0b5", "#c4a77d", "#8fa68a", "#6b8e8e"];

export default function BudgetStep() {
  const { state, nextStep, prevStep } = useJourney();

  // Calculate budget data
  const budgetData = useMemo(() => {
    const total = parseInt(state.params.totalBudgetMinor, 10) || 0;
    const spent = state.budget.spent || 0;
    const remaining = state.budget.remaining || total;

    // Calculate daily costs from journey days
    const dailyCosts = state.journey.days.map((day, index) => ({
      day: `Day ${day.dayNumber || index + 1}`,
      cost: parseInt(day.price?.minor, 10) || 0,
    }));

    // Add remaining days with 0 cost
    const totalDays = state.params.totalDays;
    for (let i = dailyCosts.length; i < totalDays; i++) {
      dailyCosts.push({ day: `Day ${i + 1}`, cost: 0 });
    }

    return {
      total,
      spent,
      remaining,
      dailyCosts,
      utilizationRate: total > 0 ? Math.round((spent / total) * 100) : 0,
    };
  }, [state.params, state.budget, state.journey.days]);

  // Pie chart data
  const pieData = [
    { name: "已花费", value: budgetData.spent, color: "#d0683b" },
    { name: "剩余预算", value: budgetData.remaining, color: "#e8a87c" },
  ];

  // Format money
  const formatMoney = (minor, currency = state.params.budgetCurrency) => {
    if (!minor) return "-";
    const value = Number(minor);
    if (isNaN(value)) return "-";
    return `${currency} ${value.toLocaleString()}`;
  };

  // Check if over budget
  const isOverBudget = budgetData.remaining < 0;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip__label">{payload[0].name || payload[0].payload.day}</p>
          <p className="chart-tooltip__value">{formatMoney(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="budget-step">
      {/* Header */}
      <header className="budget-header">
        <h1>预算报告</h1>
        <p>{state.params.destination} · {state.params.totalDays} 天行程</p>
      </header>

      {/* Summary Cards */}
      <div className="budget-summary">
        <div className="summary-card">
          <span className="summary-card__label">总预算</span>
          <span className="summary-card__value">{formatMoney(budgetData.total)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">已花费</span>
          <span className={`summary-card__value ${isOverBudget ? "summary-card__value--danger" : ""}`}>
            {formatMoney(budgetData.spent)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">剩余预算</span>
          <span className={`summary-card__value ${isOverBudget ? "summary-card__value--danger" : "summary-card__value--success"}`}>
            {formatMoney(budgetData.remaining)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-card__label">预算使用率</span>
          <span className="summary-card__value">{budgetData.utilizationRate}%</span>
        </div>
      </div>

      {/* Charts */}
      <div className="budget-charts">
        {/* Pie Chart */}
        <section className="chart-card">
          <h3 className="chart-card__title">预算分布</h3>
          <div className="chart-card__content">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Bar Chart */}
        <section className="chart-card">
          <h3 className="chart-card__title">每日花费</h3>
          <div className="chart-card__content">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={budgetData.dailyCosts}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" fill="#d0683b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Warning if over budget */}
      {isOverBudget && (
        <div className="budget-warning">
          <span className="budget-warning__icon">⚠️</span>
          <div className="budget-warning__content">
            <h4>预算超支警告</h4>
            <p>当前花费已超出预算 {formatMoney(Math.abs(budgetData.remaining))}，建议调整行程。</p>
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      <section className="budget-breakdown">
        <h3>每日花费明细</h3>
        <div className="breakdown-list">
          {state.journey.days.map((day, index) => (
            <div key={index} className="breakdown-item">
              <span className="breakdown-item__day">Day {day.dayNumber}</span>
              <span className="breakdown-item__title">{day.title}</span>
              <span className="breakdown-item__cost">
                {formatMoney(day.price?.minor, day.price?.currency)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="budget-actions">
        <button className="btn btn--secondary" onClick={prevStep}>
          返回行程
        </button>
        <div className="budget-actions__right">
          <button className="btn btn--ghost" onClick={() => nextStep()}>
            调整方案
          </button>
          <button className="btn btn--primary">
            确认行程
          </button>
        </div>
      </div>
    </div>
  );
}