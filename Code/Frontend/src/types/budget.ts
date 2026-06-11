import type { MoneyAmount } from "./money";

// Request payload for the BUDGET_CHECK gateway operation.
// Monetary fields are minor currency units encoded as strings.
export interface BudgetCheckPayload {
  remainingBudgetMinor: string;
  remainingDays: number;
  estimatedCostMinor: string;
  currency: string;
}

// Best-effort response shape — refine against the live BUDGET_CHECK response.
export interface BudgetCheckResult {
  ok: boolean;
  dailyAllowance?: MoneyAmount;
}
