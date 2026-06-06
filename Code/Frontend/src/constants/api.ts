export const API_ENDPOINTS = {
  JOURNEYS: "/api/journeys",
  journey: (id: string) => `/api/journeys/${id}`,
  journeyDay: (id: string, dayNum: number) =>
    `/api/journeys/${id}/day/${dayNum}`,
  journeyChoices: (id: string) => `/api/journeys/${id}/choices`,
  journeySelect: (id: string) => `/api/journeys/${id}/select`,
  journeyExport: (id: string) => `/api/journeys/${id}/export`,
  userPassport: (userId: string) => `/api/users/${userId}/passport`,
} as const;
