# Routing Specification

> Next.js App Router. The Book is a single route — all journey states live inside it.

---

## Routes

| Route | Screen | Auth Required |
|-------|--------|:---:|
| `/sign-in` | Sign In | No |
| `/sign-up` | Sign Up | No |
| `/` | The Book (main) | Yes |
| `/passport` | Passport Map | Yes |

---

## Route Details

### `/sign-in` — Sign In
Public. Redirects to `/` if already authenticated.

### `/sign-up` — Sign Up
Public. Redirects to `/` if already authenticated.

### `/` — The Book
Protected. The main screen. Contains every journey state:

- **Empty** — no active journey, chat panel ready for input
- **Chat active** — user is typing trip details, agent confirming fields
- **Generating** — loading/progress shown on book pages
- **Day journal** — day content rendered across book spreads
- **Choice cards** — appears at end of each day's final spread
- **Journey complete** — completion banner + export CTA
- **Export** — final pages of the book show structured itinerary

All driven by React Query state, no sub-routes needed.

### `/passport` — Passport Map
Protected. World map with GeoJSON stamps from completed journeys.

---

## Auth Middleware

`middleware.ts` at the root checks for a valid token on all protected routes. If missing, redirect to `/sign-in`.

```
/middleware.ts:
  if (path is protected && no token) → redirect /sign-in
  if (path is /sign-in or /sign-up && has token) → redirect /
```

---

## Navigation Flow

```
                    ┌──────────────┐
          ┌────────→│  Sign In     │
          │         └──────┬───────┘
          │                │ success
          │         ┌──────▼───────┐
          │         │  Sign Up     │
          │         └──────┬───────┘
          │                │ success
          │                ▼
          │         ┌──────────────────────────────┐
          │         │          The Book (/)         │
          │         │                              │
          │         │  empty → chat → generating   │
          │         │     → journal → choices      │
          │         │     → complete → export       │
          │         └──────────────┬───────────────┘
          │                        │
          │                        │ nav: passport
          │         ┌──────────────▼───────────────┐
          │         │     Passport Map (/passport) │
          │         └──────────────────────────────┘
          │
          └─── sign out (any protected route)
```

---

## App Router Directory Structure

```
app/
  layout.tsx              # Root layout (providers: React Query, auth)
  page.tsx                # / — The Book
  passport/
    page.tsx              # /passport
  sign-in/
    page.tsx              # /sign-in
  sign-up/
    page.tsx              # /sign-up
middleware.ts             # Auth guard
```
