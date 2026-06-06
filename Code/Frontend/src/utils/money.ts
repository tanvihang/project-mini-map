import type { MoneyAmount } from "@/types/money";

export function formatMoney(amount: MoneyAmount): string {
  if (amount.exponent === 0) {
    return `${amount.currency} ${amount.major}`;
  }
  return `${amount.currency} ${amount.major}.${amount.minor}`;
}

export function formatMoneyCompact(amount: MoneyAmount): string {
  return `${amount.major}.${amount.minor}`;
}
