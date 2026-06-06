import type { MoneyAmount } from "./money";

export interface PassportStamp {
  destination: string;
  coordinates: { lat: number; lon: number };
  completedAt: string;
  totalDays: number;
  totalSpent: MoneyAmount;
}
