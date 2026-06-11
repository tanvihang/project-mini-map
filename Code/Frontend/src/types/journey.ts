import type { ChoiceType, JourneyStatus } from "@/constants/journey";
import type { Waypoint, WaypointSuggestion } from "./waypoint";

// --- Request payloads -------------------------------------------------------

// Request payload for the JOURNEY_START gateway operation.
export interface JourneyStartPayload {
  userId: string;
  destination: string;
  totalDays: number;
  // Minor currency units as a string (e.g. "500000" = MYR 5000.00).
  totalBudgetMinor: string;
  budgetCurrency: string;
  travelStyle: string;
  interests: string[];
}

// A GeoJSON-style point as returned within a day's choices.
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

// One selectable next-step option attached to a day. Picking one (by its index
// in `JourneyDay.choices`) drives the JOURNEY_NEXT_DAY operation.
export interface JourneyChoice {
  type: ChoiceType;
  destinationName: string;
  destinationCoordinates: GeoPoint;
  tags: string[];
  // Minor currency units as a string (e.g. "13500" = MYR 135.00).
  estimatedCostMinor: string;
  currency: string;
  title: string;
  description: string;
}

// --- Response shapes (verified against the live gateway) --------------------

// Summary entry returned by JOURNEY_LIST.
export interface JourneySummary {
  journeyId: string;
  destination: string;
  totalDays: number;
  currentDay: number;
  budgetCurrency: string;
  totalBudgetMinor: number;
  status: JourneyStatus;
  createdAt: string;
  updatedAt: string;
}

// One day's narrative content within a journey. The backend returns a rich,
// localized structure; the fields below are verified against JOURNEY_GET —
// additional fields may exist and can be added as the UI consumes them.
export interface JourneyDay {
  dayNumber: number;
  title: string;
  time: string;
  location: {
    name: string;
    address: string | null;
    coordinates: [number, number];
  };
  story: string;
  senses: {
    see: string;
    hear: string;
    smell: string;
    taste: string;
    touch: string;
    mood: string;
  };
  dialogues: Array<{
    speaker: string;
    language: string;
    text: string;
    translation: string;
  }>;
  culture: {
    tips: string[];
    localPhrase: { phrase: string; pronunciation: string; meaning: string };
  };
  practical: {
    openingHours: string;
    crowdLevel: string;
    bestTimeToVisit: string;
    photoTip: string;
  };
  weather: { condition: string; tempC: number };
  // Minor currency units as a string (e.g. "13500" = MYR 135.00).
  price: { currency: string; minor: string };
  // The next-step options offered at the end of this day.
  choices: JourneyChoice[];
  // True when the backend returned a placeholder day (generation pending).
  stub: boolean;
}

// Full journey detail returned by JOURNEY_GET (and JOURNEY_START).
// Coordinates are [longitude, latitude] tuples; budgets are minor units.
export interface Journey {
  journeyId: string;
  userId: string;
  destination: string;
  totalDays: number;
  currentDay: number;
  budgetCurrency: string;
  totalBudgetMinor: number;
  remainingBudgetMinor: number;
  travelStyle: string;
  interests: string[];
  currentLocation: [number, number];
  startLocation: [number, number] | null;
  startLocationName: string | null;
  visitedTags: string[];
  waypoints: Waypoint[];
  status: JourneyStatus;
  days: JourneyDay[];
}

// Gateway `data` envelopes for the journey operations.
export interface JourneyResult {
  isSuccess: boolean;
  journey: Journey;
}

export interface JourneyListResult {
  isSuccess: boolean;
  journeys: JourneySummary[];
}

// The mutable journey state echoed by JOURNEY_START / JOURNEY_NEXT_DAY. Mirrors
// `Journey` but carries `currentDay` + the most recent `lastChoices` instead of
// the accumulated `days` array.
export interface JourneyState {
  journeyId: string;
  userId: string;
  destination: string;
  totalDays: number;
  currentDay: number;
  budgetCurrency: string;
  totalBudgetMinor: number;
  remainingBudgetMinor: number;
  currentLocation: [number, number] | null;
  startLocation: [number, number] | null;
  startLocationName: string | null;
  travelStyle: string;
  interests: string[];
  visitedTags: string[];
  waypoints: Waypoint[];
  lastChoices: JourneyChoice[];
}

// `data` envelope for JOURNEY_START — the freshly created state plus day one.
export interface JourneyStartResult {
  isSuccess: boolean;
  journeyId: string;
  state: JourneyState;
  day: JourneyDay;
  suggestedWaypoints: WaypointSuggestion[];
}

// `data` envelope for JOURNEY_NEXT_DAY — echoes the chosen index and returns the
// newly generated day.
export interface JourneyNextDayResult {
  isSuccess: boolean;
  journeyId: string;
  chosenIndex: number;
  day: JourneyDay;
}
