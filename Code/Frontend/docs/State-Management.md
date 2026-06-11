# State Management Design

> React Query for server state, Zustand for client/UI state. Strict separation.

---

## Architecture

```
Component → Facade / Hook → Service (API call) → Backend
                ↓
         React Query (cache)  or  Zustand (client state)
```

```
stores/
  auth/
    types.ts
    store.ts      # Zustand store
    facade.ts     # Public API — components only import this
  book/
    types.ts
    store.ts
    facade.ts

services/
  journey.ts     # API functions: createJourney, fetchDay, fetchChoices, selectChoice, exportJourney
  passport.ts    # API function: fetchPassport
  auth.ts        # API functions: signIn, signUp

hooks/
  useJourney.ts      # React Query hooks wrapping journey service
  usePassport.ts     # React Query hooks wrapping passport service
```

---

## Server State — React Query (TanStack Query)

Everything fetched from or sent to the backend lives here. React Query handles caching, loading/error states, refetching, and deduplication.

### Journey hooks (`hooks/useJourney.ts`)

| Hook | API | Query / Mutation |
|------|-----|-----------------|
| `useCreateJourney` | `POST /api/journeys` | Mutation |
| `useDay(dayNum)` | `GET /api/journeys/:id/day/:dayNum` | Query |
| `useChoices(dayNum)` | `POST /api/journeys/:id/choices` | Mutation |
| `useSelectChoice` | `POST /api/journeys/:id/select` | Mutation |
| `useExportJourney` | `POST /api/journeys/:id/export` | Mutation |

### Passport hooks (`hooks/usePassport.ts`)

| Hook | API | Query / Mutation |
|------|-----|-----------------|
| `usePassport` | `GET /api/users/:userId/passport` | Query |

---

## Client State — Zustand

Only state that is purely local to the browser. No API calls live here.

### Auth Store
Holds `user`, `token`, `isAuthenticated`. `signIn`/`signUp` actions call auth service functions (API is in the service layer, not the store). Persisted to localStorage.

### Book Store
Manages the book UI only:
- `currentSpread` — which page spread is open
- `isPageTurning` — animation lock
- `narrativeProgress` — 0→1 text reveal counter
- `mediaStates` — per-asset resolution: `loading` → `resolved` → `error`
- `isChatOpen` — chat panel toggle

No persistence needed (re-computed from journey data on load).

---

## Service Layer (`services/`)

Thin functions that call the API — no state, no hooks, just `fetch`. React Query hooks and Auth store actions call into these.

```
services/journey.ts   →  createJourney, fetchDay, fetchChoices, selectChoice, exportJourney
services/passport.ts  →  fetchPassport
services/auth.ts      →  signIn, signUp
```

---

## Cross-Layer Coordination

Orchestration happens in the component or a custom hook, not inside any store:

- `useSelectChoice` mutation → onSuccess → invalidate day query + call `bookFacade.resetToNewDay()`
- `authFacade.signOut()` → clears auth store → resets book store → clears React Query cache
- `useCreateJourney` mutation → onSuccess → prefetch day 1 → `bookFacade.openFirstSpread()`

---

## Progressive Narrative Rendering

Backend returns full day response. The `<TypewriterText>` component drives a 0→1 progress counter in the Book store to clip visible text locally. Choice cards gate on `narrativeProgress == 1` + user on final spread.

## Media Resolution

Per-asset state (`loading` → `resolved` → `error`) tracked in Book store. `<MediaImage>` component updates it on mount/fetch/error.
