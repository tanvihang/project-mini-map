export const JOURNEY_STATUS = {
  IDLE: "idle",
  READY: "ready",
  GENERATING: "generating",
  ACTIVE: "active",
  COMPLETED: "completed",
  EXPORTED: "exported",
} as const;

export type JourneyStatus = (typeof JOURNEY_STATUS)[keyof typeof JOURNEY_STATUS];

export const CHOICE_TYPES = {
  MOVE: "move",
  ACTIVITY: "activity",
  EXPLORE: "explore",
  SLOW: "slow",
} as const;

export type ChoiceType = (typeof CHOICE_TYPES)[keyof typeof CHOICE_TYPES];

export const PRICE_CATEGORIES = {
  ACCOMMODATION: "accommodation",
  FOOD: "food",
  TRANSPORT: "transport",
  ENTRY: "entry",
  OTHER: "other",
} as const;

export type PriceCategory =
  (typeof PRICE_CATEGORIES)[keyof typeof PRICE_CATEGORIES];
