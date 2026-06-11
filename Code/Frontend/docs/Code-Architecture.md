# Code Architecture

> Folder structure, layer boundaries, and dependency rules for the Next.js frontend.

---

## Directory Structure

```
src/
├── api/                  # HTTP client setup (fetch wrapper, base URL, interceptors)
├── app/                  # Next.js App Router — route files only, thin
│   ├── layout.tsx
│   ├── page.tsx          # / → BookScreen
│   ├── passport/
│   │   └── page.tsx      # /passport → PassportScreen
│   ├── sign-in/
│   │   └── page.tsx      # /sign-in → SignInScreen
│   ├── sign-up/
│   │   └── page.tsx      # /sign-up → SignUpScreen
│   └── middleware.ts      # Auth guard
├── assets/               # Static files — images, icons, fonts
├── components/            # Shared UI components
├── config/               # App configuration (env vars, feature flags)
├── constants/            # Enums, magic strings, route paths
├── context/              # React contexts (if any beyond Zustand)
├── data/                 # Hardcoded / demo data
├── hooks/                # Custom hooks
├── localization/         # i18n — translation files per locale
├── navigation/           # Navigation helpers, route config
├── screens/              # Page-level components (the actual UI)
├── services/             # API call functions — thin fetch wrappers
├── storage/              # localStorage / sessionStorage helpers
├── store/                # Zustand stores + facades
├── types/                # TypeScript type definitions
└── utils/                # Pure utility functions
```

---

## Layer Dependency Rules

```
app/  →  screens/  →  components/  +  hooks/  +  store/  +  services/
                                  ↘
                              types/  utils/  constants/  config/
```

- **`app/`** may import from `screens/` only (plus layout dependencies)
- **`screens/`** may import from `components/`, `hooks/`, `store/`, `services/`, `types/`, `utils/`
- **`components/`** may import from `hooks/`, `store/`, `types/`, `utils/` — never from `screens/` or `services/`
- **`hooks/`** may import from `services/`, `store/`, `types/`
- **`services/`** may import from `api/`, `types/`, `config/` — never from `store/` or React
- **`store/`** may import from `types/`, `storage/`, `services/` (auth only)
- **`utils/`** pure functions — no imports from other project folders except `types/`

---

## Folder Responsibilities

### `api/`
HTTP client setup. Base URL from env, auth token injection via interceptor, error normalization.

```

api/
├── client.ts         # fetch wrapper — base URL, headers, error handling
└── interceptors.ts   # token injection, response parsing
```

### `app/`
Next.js App Router. Each route file is thin — imports the screen and renders it. Auth middleware lives here.

```
app/
├── layout.tsx        # RootLayout — Providers (QueryClient, Auth), TopBar, fonts
├── page.tsx          # imports BookScreen from @/screens
├── passport/
│   └── page.tsx
├── sign-in/
│   └── page.tsx
├── sign-up/
│   └── page.tsx
└── middleware.ts
```

### `assets/`
Fonts (Lora, Inter), icons (SVG sprites), images (logo, favicon, placeholder).

### `components/`
Shared UI components. Each component gets its own folder if it has styles or sub-components.

```
components/
├── AuthCard.tsx
├── BudgetBar.tsx
├── ChatBubble.tsx
├── ChatInput.tsx
├── ChoiceCard.tsx
├── DayHeader.tsx
├── DialogueBlock.tsx
├── EmptyState.tsx
├── ErrorBanner.tsx
├── MediaImage.tsx
├── MoneyDisplay.tsx
├── PracticalBlock.tsx
├── SensesBlock.tsx
├── Skeleton.tsx
├── Spinner.tsx
├── TypeBadge.tsx
├── TypewriterText.tsx
└── ...
```

### `config/`
Environment variables mapped to typed config object. Feature flags if any.

```
config/
└── index.ts          # typed config from process.env
```

### `constants/`
Route paths, choice types, price categories, API base paths.

```
constants/
├── routes.ts         # ROUTES = { SIGN_IN: '/sign-in', BOOK: '/', ... }
├── journey.ts        # choice types enum, price categories enum, status enum
└── api.ts            # API_BASE, endpoints
```

### `context/`
React Context providers (if needed beyond Zustand — e.g., theme, or the Typewriter animation context).

### `data/`
Hardcoded demo data, fallback content, seed POI lists for development.

### `hooks/`
Custom hooks. Wraps React Query mutations/queries for the journey flow. Also UI hooks like `useTypewriter`, `useMediaResolver`, `usePageTurn`.

```
hooks/
├── useJourney.ts         # Query/mutation hooks for journey API
├── usePassport.ts        # Query hook for passport API
├── useTypewriter.ts      # Character-by-character text reveal
├── useMediaResolver.ts   # Lazy-load image by ref hash
└── usePageTurn.ts        # Page-turn animation state
```

### `localization/`
i18n with support for English and Chinese. Use a lightweight lib (e.g., `next-intl` or `i18next`). Each locale has its own translation file.

```
localization/
├── index.ts              # i18n setup — detection, provider
├── en/
│   ├── common.json       # Buttons, labels, errors
│   ├── auth.json         # Sign in / sign up strings
│   ├── journey.json      # Day header, choice labels, budget tracker
│   └── passport.json     # Passport map strings
└── zh/
    ├── common.json
    ├── auth.json
    ├── journey.json
    └── passport.json
```

Namespaces are loaded by screen — keeps bundles small.

### `navigation/`
Route config and typed navigation helpers.

```
navigation/
└── index.ts          # typed path builders: buildBookPath(), buildPassportPath()
```

### `screens/`
Page-level components. These own the layout of an entire screen. They compose shared components + hooks. One folder per screen.

```
screens/
├── SignInScreen.tsx
├── SignUpScreen.tsx
├── BookScreen/
│   ├── BookScreen.tsx        # Main layout — ChatPanel + Book
│   ├── ChatPanel.tsx         # Chat sidebar container
│   ├── Book/
│   │   ├── Book.tsx          # Book chrome + spread container
│   │   ├── BookChrome.tsx    # Cover, spine, page edges
│   │   ├── BookSpread.tsx    # Renders correct spread based on state
│   │   ├── spreads/
│   │   │   ├── EmptySpread.tsx
│   │   │   ├── GeneratingSpread.tsx
│   │   │   ├── DayJournalSpread.tsx
│   │   │   ├── ChoiceCardsSpread.tsx
│   │   │   ├── CompleteSpread.tsx
│   │   │   └── ExportSpread.tsx
│   │   └── BookNavigation.tsx
│   └── ...
└── PassportScreen/
    ├── PassportScreen.tsx
    ├── WorldMap.tsx
    └── StampList.tsx
```

### `services/`
Thin functions that call the API. No React, no hooks, no stores. Just typed `fetch` calls. Return parsed JSON.

```
services/
├── journey.ts         # createJourney, fetchDay, fetchChoices, selectChoice, exportJourney
├── passport.ts        # fetchPassport
└── auth.ts            # signIn, signUp
```

### `storage/`
Typed wrapper around localStorage/sessionStorage. JSON parse/stringify handled here.

```
storage/
└── index.ts           # getItem<T>, setItem<T>, removeItem
```

### `store/`
Zustand stores with facade pattern. Each store in its own folder. Only client/UI state lives here — server state is in React Query (hooks).

```
store/
├── auth/
│   ├── types.ts
│   ├── store.ts       # create + persist middleware
│   └── facade.ts      # public API — components import this
└── book/
    ├── types.ts
    ├── store.ts
    └── facade.ts
```

### `types/`
Shared TypeScript types used across layers. Mirrors API response shapes.

```
types/
├── journey.ts         # Journey, DayContent, Node, ChoiceCard, ExportPlan
├── money.ts           # MoneyAmount, Money
├── auth.ts            # User, AuthState
├── passport.ts        # PassportStamp
├── book.ts            # BookState, MediaState
└── api.ts             # API response wrappers, error shapes
```

### `utils/`
Pure functions. No side effects, no React imports.

```
utils/
├── money.ts           # formatMoney(major, minor) → "44.00"
├── date.ts            # formatDate, formatDateRange
├── text.ts            # truncate, estimateCharCount
└── cn.ts              # className merge utility
```

---

## i18n Approach

- Library: `next-intl` (built for Next.js App Router, server + client support)
- Two locales: `en` (default), `zh`
- Detection: browser `Accept-Language` header
- Namespaced JSON files — each screen loads only its own namespace
- Money formatting uses `Intl.NumberFormat` with the locale and currency, not translation strings
- The journal narrative itself is NOT translated — it's generated by the backend in the user's language. Only UI chrome is i18n'd.

---

## Data Flow Summary

```
User Action
  → Screen component calls a hook (useJourney, usePassport)
    → Hook calls a service function (services/journey.ts)
      → Service calls api/client.ts (fetch wrapper)
        → Backend

Response flows back:
  → Service returns typed data
    → React Query caches it
      → Hook exposes { data, isLoading, error }
        → Screen renders components with the data

Client-only state (book page, narrative progress, media):
  → Component calls facade (store/book/facade.ts)
    → Facade reads/writes Zustand store
      → Component re-renders
```
