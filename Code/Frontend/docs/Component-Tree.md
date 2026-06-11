# Component Tree & Hierarchy

> Page-level and shared components. The Book is the largest subtree — it renders everything from empty state through to export.

---

## Layout

```
RootLayout
├── Providers          # React Query + Auth context
├── TopBar             # Logo, My Journeys dropdown, 🔔, user avatar
└── {children}
```

---

## Pages

```
SignInPage
└── AuthCard
    ├── EmailInput
    ├── PasswordInput
    ├── SubmitButton
    └── AltLink ("Don't have an account?")

SignUpPage
└── AuthCard
    ├── EmailInput
    ├── PasswordInput
    ├── ConfirmPasswordInput
    ├── SubmitButton
    └── AltLink ("Already have an account?")

BookPage                                    # / — the main screen
├── ChatPanel                               # Left sidebar
│   ├── ChatMessages
│   │   └── ChatBubble (user | agent) ×N
│   └── ChatInput
├── Book                                    # Center — the book itself
│   ├── BookChrome                          # Cover, spine, page-stack edges
│   ├── BookSpread                          # Current 2-page spread — content depends on state:
│   │   │
│   │   ├── EmptyState                      # "Your journal awaits..."
│   │   │
│   │   ├── GeneratingState                 # Progress steps while backend works
│   │   │
│   │   ├── DayJournalSpread                # A spread of day content
│   │   │   ├── DayHeader                   # Day N, title, date, weather
│   │   │   ├── TypewriterText              # Narrative — reveals character-by-character
│   │   │   ├── SensesBlock                 # SEE · HEAR · SMELL · TASTE · TOUCH · MOOD
│   │   │   ├── DialogueBlock               # Speaker, language, original + translation
│   │   │   ├── CultureBlock                # Local phrase, pronunciation, dos/donts
│   │   │   ├── MediaImage                  # Skeleton → resolved image + caption
│   │   │   ├── AmbientSoundToggle          # Play/pause ambient audio
│   │   │   ├── PracticalBlock              # Hours, crowd, best time, photo tip, booking
│   │   │   └── DayEndSummary               # Day total, cost breakdown, budget tracker bar
│   │   │
│   │   ├── ChoiceCardsSpread               # 2 cards per page, 4 cards = 2 spreads
│   │   │   └── ChoiceCard ×4
│   │   │       ├── TypeBadge               # move / activity / explore / slow
│   │   │       ├── Title
│   │   │       ├── Description
│   │   │       ├── TravelTime
│   │   │       ├── EstimatedCost            # MoneyAmount display
│   │   │       ├── Tags
│   │   │       ├── RecommendedBadge         # ⭐ conditional
│   │   │       └── TightBudgetBadge         # ⚠️ conditional
│   │   │
│   │   ├── CompleteBanner                  # "Your journal is complete" + Export CTA
│   │   │
│   │   └── ExportSpread                    # Final pages — structured itinerary
│   │       ├── BudgetSummary               # Total spent vs budget bar
│   │       ├── BudgetCategoryBreakdown     # Per-category amounts
│   │       └── ExportDayList
│   │           └── ExportDayItem ×N
│   │               └── ExportNodeItem ×N   # Time, title, transport, price, tip
│   │
│   └── BookNavigation                      # ← Prev / Next spread → · page number
│
└── (ChatPanel and Book are siblings — chat is outside the book)

PassportPage                                # /passport
├── WorldMap                                # Leaflet / Mapbox
│   └── StampMarker ×N                      # GeoJSON pin per destination
└── StampList
    └── StampCard ×N                        # Destination, date, days, total spent
```

---

## Shared Components

| Component | Used By | Purpose |
|-----------|---------|---------|
| `GlassCard` | Auth pages, choice cards, summary blocks | Glassmorphic container (blur, border-radius, shadow) |
| `MoneyDisplay` | DayEndSummary, ChoiceCard, Export, StampCard | Renders `major.minor` from MoneyAmount |
| `BudgetBar` | DayEndSummary, BudgetSummary | Visual bar: spent (filled) vs remaining (empty) |
| `Skeleton` | MediaImage, ChoiceCards (loading), StampCard (loading) | Pulsing placeholder |
| `ErrorBanner` | Any page after API error | Red banner with message + retry |
| `Spinner` | GeneratingState, any loading button | Animated loading indicator |
| `TypeBadge` | ChoiceCard | Colored badge: move / activity / explore / slow |
| `EmptyState` | Book (idle), Passport (no stamps) | Icon + message + CTA |
