import { api } from "@/api/client";
import { OPERATION_TYPES } from "@/constants/api";
import type { BudgetCheckPayload, BudgetCheckResult } from "@/types/budget";

export function checkBudget(
  payload: BudgetCheckPayload,
): Promise<BudgetCheckResult> {
  return api.gateway<BudgetCheckResult>(OPERATION_TYPES.BUDGET_CHECK, payload);
}
