import type { MoneyAmount } from "./money";
import type { ChoiceType, JourneyStatus, PriceCategory } from "@/constants/journey";

export interface Node {
  time: string;
  title: string;
  location: {
    name: string;
    address: string;
    coordinates: { type: "Point"; coordinates: [number, number] };
  };
  transport: string;
  weather: { condition: string; tempC: number; source: string };
  priceCategory: PriceCategory;
  senses: {
    see: string;
    hear: string;
    smell: string;
    taste: string;
    touch: string;
    mood: string;
    story: string;
  };
  dialogues: Array<{
    speaker: string;
    language: string;
    text: string;
    translation: string;
  }>;
  culture: {
    cultureTips: string[];
    localPhrase: { phrase: string; pronunciation: string; meaning: string };
    dosDonts: { dos: string[]; donts: string[] };
  };
  practical: {
    openingHours: string;
    crowdLevel: string;
    bestTimeToVisit: string;
    photoTip: string;
    bookingRequired: boolean;
  };
  media: {
    referencePhotos: string[];
    ambientSound?: string;
  };
  searchTags: string[];
}

export interface DayContent {
  dayNumber: number;
  currency: string;
  nodes: Node[];
  dayTotal: MoneyAmount;
  costBreakdown: Record<string, MoneyAmount>;
  localPhrases: Array<{
    phrase: string;
    pronunciation: string;
    meaning: string;
  }>;
  media: Array<{ ref: string; caption: string }>;
}

export interface ChoiceCard {
  choiceId: string;
  type: ChoiceType;
  title: string;
  description: string;
  estimatedCost: MoneyAmount;
  travelTimeFromCurrent: string;
  destinationCoordinates: { lat: number; lon: number };
  destinationName: string;
  tags: string[];
  isRecommended: boolean;
  isTightBudget: boolean;
}

export interface ExportDayNode {
  time: string;
  title: string;
  address: string;
  price: string;
  transport: string;
  tip: string;
  bookingRequired: boolean;
}

export interface ExportDay {
  dayNumber: number;
  date: string;
  title: string;
  dayTotal: MoneyAmount;
  nodes: ExportDayNode[];
}

export interface ExportPlan {
  journeyId: string;
  destination: string;
  dates: string;
  currency: string;
  totalSpent: MoneyAmount;
  totalBudget: MoneyAmount;
  budgetByCategory: Record<string, MoneyAmount>;
  days: ExportDay[];
}

export interface Journey {
  journeyId: string;
  destination: string;
  startDate: string;
  totalDays: number;
  totalBudget: number;
  budgetCurrency: string;
  travelStyle: string;
  interests: string[];
  status: JourneyStatus;
  currentDay: number;
  remainingBudget: MoneyAmount | null;
  remainingDays: number;
}
