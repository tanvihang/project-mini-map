export const ROUTES = {
  BOOK: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  PASSPORT: "/passport",
  // Trip detail — `:journeyId` is filled in via `tripPath()`.
  TRIP: "/trip/:journeyId",
} as const;

// Builds a concrete path to a single trip's detail screen.
export const tripPath = (journeyId: string) => `/trip/${journeyId}`;
