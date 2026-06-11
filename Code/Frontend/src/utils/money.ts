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

// Formats a raw minor-unit amount (string or number) into a "CUR 1,234.56"
// display string. The gateway returns costs as minor units (e.g. "13500" with
// a 2-digit exponent = MYR 135.00).
export function formatMinorUnits(
  minor: string | number,
  currency: string,
  exponent = 2,
): string {
  const value = Number(minor);
  if (!Number.isFinite(value)) return `${currency} —`;
  const major = value / 10 ** exponent;
  const formatted = major.toLocaleString(undefined, {
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  });
  return `${currency} ${formatted}`;
}
