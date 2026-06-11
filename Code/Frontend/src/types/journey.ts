import type { JourneyStatus } from "@/constants/journey";
import type { Waypoint } from "./waypoint";

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
