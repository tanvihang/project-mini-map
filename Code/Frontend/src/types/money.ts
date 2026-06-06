export interface MoneyAmount {
  currency: string;
  exponent: number;
  minorUnits: string;
  major: string;
  minor: string;
}

export interface Money {
  display: MoneyAmount;
  local: MoneyAmount;
  fxRate: number;
  asOf: string;
}
