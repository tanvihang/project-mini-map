# UI Wireframes & Screen Mockups

> ASCII wireframes for every screen in the Mini-Map frontend.
> Dark-mode glassmorphic theme. Primary metaphor: an actual book.

---

## Screen A — Sign In

```
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                         [Mini-Map Logo]                            |
|                                                                    |
|                    Every journey is unique.                        |
|                 Live yours virtually before you go.                |
|                                                                    |
|          +---------------------------------------------+          |
|          |                                             |          |
|          |  Email                                      |          |
|          |  [__________________________________]       |          |
|          |                                             |          |
|          |  Password                                   |          |
|          |  [__________________________________]  👁    |          |
|          |                                             |          |
|          |  [          Sign In                ]        |          |
|          |                                             |          |
|          |  Don't have an account? Sign Up              |          |
|          |                                             |          |
|          +---------------------------------------------+          |
|                                                                    |
+------------------------------------------------------------------+
```

**Elements:**

- Mini-Map logo + tagline
- Email input field
- Password input field with show/hide toggle
- Sign In button (primary)
- Link to Sign Up screen

---

## Screen B — Sign Up

```
+------------------------------------------------------------------+
|                                                                    |
|                                                                    |
|                         [Mini-Map Logo]                            |
|                                                                    |
|                      Start your first journey.                     |
|                                                                    |
|          +---------------------------------------------+          |
|          |                                             |          |
|          |  Email                                      |          |
|          |  [__________________________________]       |          |
|          |                                             |          |
|          |  Password                                   |          |
|          |  [__________________________________]  👁    |          |
|          |                                             |          |
|          |  Confirm Password                           |          |
|          |  [__________________________________]       |          |
|          |                                             |          |
|          |  [          Create Account          ]        |          |
|          |                                             |          |
|          |  Already have an account? Sign In            |          |
|          |                                             |          |
|          +---------------------------------------------+          |
|                                                                    |
+------------------------------------------------------------------+
```

**Elements:**
- Same centered card layout as Sign In
- Email, Password, Confirm Password fields
- Create Account button
- Link back to Sign In

---

## Screen C — The Book (Main Screen)

### Overall Layout

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   LEFT PAGE      |    RIGHT PAGE    ||         |
|          |     ||                  |                  ||         |
|  CHAT    |     ||                  |                  ||         |
|  PANEL   |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     ||                  |                  ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < Page N >               📖      ||         |
|          |     \\=====================================//         |
|          |                                                       |
|          |     [ ← Prev Spread ]          [ Next Spread → ]      |
+------------------------------------------------------------------+
```

**Book chrome elements:**
- Open book with stitched/leather spine in center
- Page number display at bottom
- Prev/Next spread navigation buttons
- Book edges visible (stacked pages on left/right sides)

**Top bar (outside book):**
- Mini-Map logo (links to home/new journey)
- My Journeys dropdown (past journeys)
- Notification bell
- User avatar/name

**Chat panel (left sidebar, outside book):**
- Chat message history
- Text input at bottom
- Collapsible/expandable

---

### C-1: Book — Empty / New Journey State

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|  CHAT    |     ||                                     ||         |
|  PANEL   |     ||                                     ||         |
|          |     ||                                     ||         |
|  +----+  |     ||        Your journal awaits.         ||         |
|  |    |  |     ||                                     ||         |
|  |    |  |     ||    Describe your trip below —       ||         |
|  |    |  |     ||    the agent will ask if it         ||         |
|  |    |  |     ||    needs more details.              ||         |
|  +----+  |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 1 >                           ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements:**
- Blank/open pages with placeholder text guiding user to start
- Chat panel empty (no messages yet)
- Subtle prompt on the book pages

---

### C-2: Book — Chat Input Active (User Filling Trip Details)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|  +----+  |     ||                                     ||         |
|  |    |  |     ||   "I want to go to Kathmandu        ||         |
|  |User|  |     ||    for 7 days. Budget MYR 6000.     ||         |
|  |msg |  |     ||    I love photography and temples."  ||         |
|  +----+  |     ||                                     ||         |
|          |     ||                                     ||         |
|  +----+  |     ||                                     ||         |
|  |Agnt|  |     ||                                     ||         |
|  |msg |  |     ||                                     ||         |
|  +----+  |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|  +----+  |     |+-----------------------------------+|         |
|  |Type|  |     ||  < 1 >                           ||         |
|  |____|  |     \\=====================================//         |
|  [Send]  |                                                       |
+------------------------------------------------------------------+
```

**Elements:**
- Chat panel shows conversation:
  - User message bubble (their free-text trip description)
  - Agent response bubble (confirming fields, asking for missing info)
- Book pages show a subtle loading/thinking state or remain on placeholder
- Text input + Send button at bottom of chat panel

**Chat flow:**
- Agent confirms: destination ✓, days ✓, budget ✓, currency ✓, style ✓, interests ✓
- Or agent asks: "When would you like to go?" / "What's your travel style?"
- Once all 6 fields confirmed → agent says "Got it. Creating your journey..." → transitions to C-3

---

### C-3: Book — Generating / Loading State

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|  +----+  |     ||                                     ||         |
|  |Agnt|  |     ||                                     ||         |
|  |"All|  |     ||          Creating your              ||         |
|  |set"|  |     ||       journey to Kathmandu          ||         |
|  +----+  |     ||                                     ||         |
|          |     ||          ⠋ Fetching weather...      ||         |
|          |     ||          ✓ Weather loaded            ||         |
|          |     ||          ✓ POIs cached               ||         |
|          |     ||          ⠇ Generating Day 1...      ||         |
|          |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 1 >                           ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements:**
- Book pages show a loading/progress state
- Step-by-step progress indicators:
  - Fetching weather data
  - Caching nearby POIs
  - Fetching FX rates
  - Generating Day 1 narrative
- Chat panel shows agent confirmation message
- Transition: when Day 1 is ready → book animates to Day 1 journal spread (C-4)

---

### C-4: Book — Day Journal (Reading Mode)

#### C-4a: Day Opening Spread (First 2 Pages)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|  +----+  |     ||   DAY 1                  Oct 3     ||         |
|  |    |  |     ||   Arrival — Thamel       22°C ☀️    ||         |
|  |    |  |     ||                                     ||         |
|  |    |  |     ||   [media: airport photo]            ||         |
|  |journey|     ||   ████████████████████████           ||         |
|  |summary|     ||                                     ||         |
|  |mini  |     ||   "The doors slide open and          ||         |
|  |card  |     ||    Kathmandu arrives all at           ||         |
|  +----+  |     ||    once — diesel, incense,          ||         |
|          |     ||    and dust mixing into the          ||         |
|          |     ||    first breath of the valley."      ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 2–3 >              📖          ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements on opening spread:**
- **Left page**: Day number, title, date, weather icon + temp, hero media image
- **Right page**: First-person narrative begins (word-by-word progressive rendering)
- **Chat panel**: collapsed or shows a mini journey summary card (destination, days, budget remaining)

#### C-4b: Mid-Day Spread (Content Pages)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   ...the taxi driver turns and      ||         |
|          |     ||   says:                             ||         |
|          |     ||                                     ||         |
|          |     ||   🗣 "Thamel? Paltan ho,            ||         |
|          |     ||      sajilo cha."                   ||         |
|          |     ||   → "Thamel? It's busy, but         ||         |
|          |     ||      easy to reach."                ||         |
|          |     ||                                     ||         |
|          |     ||   SEE: Terraced hills folding       ||         |
|          |     ||        into haze                    ||         |
|          |     ||   HEAR: Clatter of baggage belt     ||         |
|          |     ||   SMELL: Diesel, incense, dust      ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 4–5 >              📖          ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements on content spreads (varies by node):**
- **Narrative** continues across pages (progressive rendering)
- **Dialogues** with speaker indicator, language tag, original text, translation
- **Five Senses** block: SEE · HEAR · SMELL · TASTE · TOUCH · MOOD
- **Cultural Layer**: local phrase with pronunciation, dos/donts

#### C-4c: Media & Practical Spread

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   [media: Boudhanath stupa photo]   ||         |
|          |     ||   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ||         |
|          |     ||   ░░░░ skeleton placeholder ░░░░░░  ||         |
|          |     ||   ░░░░ → resolves to image ░░░░░░░  ||         |
|          |     ||   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ||         |
|          |     ||   "The white dome rises against     ||         |
|          |     ||    the morning sky..."               ||         |
|          |     ||                                     ||         |
|          |     ||   🕐 Best time: Dawn (5:30–7:00)    ||         |
|          |     ||   👥 Crowd level: Moderate           ||         |
|          |     ||   📷 Photo tip: Prayer flag side    ||         |
|          |     ||   🎫 Booking: Not required          ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 6–7 >              📖          ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements on media spreads:**
- **Photo placeholder** (skeleton/aspect-ratio box) → resolves lazily
- **Caption** below photo
- **Practical info**: opening hours, crowd level, best time, photo tip, booking required
- **Ambient sound**: small play button or auto-play toggle

#### C-4d: Day End Spread (Cost Breakdown + Turn Page for Choices)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   —— END OF DAY 1 ——                ||         |
|          |     ||                                     ||         |
|          |     ||   💰 Day Total: MYR 81.00           ||         |
|          |     ||                                     ||         |
|          |     ||   Breakdown:                        ||         |
|          |     ||   🏨 Accommodation    MYR 35.00     ||         |
|          |     ||   🍜 Food             MYR 18.00     ||         |
|          |     ||   🚕 Transport        MYR 22.00     ||         |
|          |     ||   🎫 Entry Fees        MYR 6.00     ||         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────────┐   ||         |
|          |     ||   │ Budget: MYR 5,919 / 6,000   │   ||         |
|          |     ||   │ ████████░░░░ 6 days remain  │   ||         |
|          |     ||   └─────────────────────────────┘   ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 8–9 >        → turn for choices ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements:**
- "End of Day N" divider
- Day total in display currency (MoneyAmount: major + minor)
- Category breakdown list with icons
- Budget tracker bar: remaining budget visual + remaining days count
- "Turn page for choices" prompt

#### C-4e: Final Day — Journey Complete Banner

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   —— END OF DAY 7 ——                ||         |
|          |     ||                                     ||         |
|          |     ||   💰 Day Total: MYR 62.00           ||         |
|          |     ||   📊 Remaining: MYR 2,160.00        ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||                                     ||         |
|          |     ||   ╔═══════════════════════════╗    ||         |
|          |     ||   ║                           ║    ||         |
|          |     ||   ║   YOUR JOURNAL IS         ║    ||         |
|          |     ||   ║   COMPLETE                ║    ||         |
|          |     ||   ║                           ║    ||         |
|          |     ||   ║   7 days in Kathmandu     ║    ||         |
|          |     ||   ║   MYR 3,840 of 6,000     ║    ||         |
|          |     ||   ║                           ║    ||         |
|          |     ||   ║   [ Export Real Plan ]    ║    ||         |
|          |     ||   ║   [ Stamp My Passport ]   ║    ||         |
|          |     ||   ║                           ║    ||         |
|          |     ||   ╚═══════════════════════════╝    ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 14–15 >                       ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements:**
- Day 7 end-of-day cost breakdown (same as C-4d)
- Completion banner on next spread:
  - "Your Journal is Complete" title
  - Summary: destination, days, total spent vs budget
  - **Export Real Plan** button (primary CTA)
  - **Stamp My Passport** button (secondary)
- Export is triggered here; results flow into the final pages (C-6)

---

### C-5: Book — Choice Cards (End of Each Day)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   WHERE TO TOMORROW?                ||         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────┐       ||         |
|          |     ||   │ 🏙️  MOVE                 │       ||         |
|          |     ||   │ Bhaktapur — Ancient City │ ⭐    ||         |
|          |     ||   │ Two hours by local bus to│       ||         |
|          |     ||   │ the best-preserved medieval│      ||         |
|          |     ||   │ city in the valley.      │       ||         |
|          |     ||   │ 🚕 1.5hr bus  💰 MYR 95  │       ||         |
|          |     ||   │ #unesco #architecture     │       ||         |
|          |     ||   └─────────────────────────┘       ||         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────┐       ||         |
|          |     ||   │ 🥾  ACTIVITY              │       ||         |
|          |     ||   │ Nagarkot Sunrise Hike    │       ||         |
|          |     ||   │ Wake at 4am for the      │       ||         |
|          |     ||   │ Himalaya panorama — eight│       ||         |
|          |     ||   │ peaks visible on clear day│      ||         |
|          |     ||   │ 🚕 1hr taxi  💰 MYR 120  │       ||         |
|          |     ||   │ #himalaya #hiking #sunrise│       ||         |
|          |     ||   └─────────────────────────┘       ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 10–11 >      pick one ↑       ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────┐       ||         |
|          |     ||   │ 🏛️  EXPLORE              │       ||         |
|          |     ||   │ Pashupatinath Temple     │       ||         |
|          |     ||   │ Nepal's most sacred Hindu│       ||         |
|          |     ||   │ site on the Bagmati River│       ||         |
|          |     ||   │ 🚕 20min taxi 💰 MYR 110 │       ||         |
|          |     ||   │ #spiritual #world-heritage│      ||         |
|          |     ||   └─────────────────────────┘       ||         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────┐       ||         |
|          |     ||   │ 😌  SLOW DAY             │       ||         |
|          |     ||   │ Thamel Café-Hopping      │       ||         |
|          |     ||   │ Sleep in, then wander the│       ||         |
|          |     ||   │ backstreets sampling momo│       ||         |
|          |     ||   │ and chai at rooftop cafés│       ||         |
|          |     ||   │ 🚶 Walking  💰 MYR 40    │       ||         |
|          |     ||   │ #food #relaxed #local     │       ||         |
|          |     ||   └─────────────────────────┘       ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 12–13 >      pick one ↑       ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Elements per choice card:**
- **Type badge**: MOVE 🏙️ / ACTIVITY 🥾 / EXPLORE 🏛️ / SLOW 😌
- **Title** (max 8 words)
- **Description** (2 sentences)
- **Travel time** from current location
- **Estimated cost** in display currency (MoneyAmount)
- **Tags** (hashtag style)
- **⭐ Recommended** badge (if isRecommended)
- **⚠️ Tight Budget** badge (if isTightBudget — card border changes to amber/red)
- **2 cards per page spread** (4 cards = 2 spreads)
- Clicking a card highlights it → triggers next day generation

**Post-selection loading:**
- Selected card glows/highlights briefly
- Book animates (page flip) → shows loading state briefly → next day renders

---

### C-6: Book — Export / Summary (Final Pages)

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [My Journeys ▼]  [🔔]  [👤 Angus]  |
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   YOUR REAL PLAN                    ||         |
|          |     ||   Kathmandu, Nepal                  ||         |
|          |     ||   Oct 3–10, 2026 · 7 Days           ||         |
|          |     ||                                     ||         |
|          |     ||   ┌─────────────────────────────┐   ||         |
|          |     ||   │ Budget: MYR 3,840 / 6,000   │   ||         |
|          |     ||   │ ████████████░░░░░░░░░░░░░░░ │   ||         |
|          |     ||   │ Remaining: MYR 2,160        │   ||         |
|          |     ||   └─────────────────────────────┘   ||         |
|          |     ||                                     ||         |
|          |     ||   🏨 Accommodation    MYR 520       ||         |
|          |     ||   🍜 Food             MYR 420       ||         |
|          |     ||   🚕 Transport        MYR 250       ||         |
|          |     ||   🎫 Entry Fees        MYR 310       ||         |
|          |     ||   📦 Other            MYR 140       ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 16–17 >          📖            ||         |
|          |     \\=====================================//         |
|          |                                                       |
+------------------------------------------------------------------+
```

**Export summary spread (first 2 pages):**
- Header: destination, dates, total days
- Budget bar: total spent vs budget
- Category breakdown: 5 categories with amounts
- "Download PDF" or "Print" button

**Export day-by-day spreads (following pages):**

```
+------------------------------------------------------------------+
|          |                                                       |
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   DAY 1 · Oct 3                     ||         |
|          |     ||   Arrival — Thamel    MYR 81.00     ||         |
|          |     ||                                     ||         |
|          |     ||   14:30  Land at Tribhuvan Airport  ||         |
|          |     ||          🚕 Taxi ~MYR 44            ||         |
|          |     ||          💡 Fixed-price taxi from   ||         |
|          |     ||             official counter        ||         |
|          |     ||                                     ||         |
|          |     ||   16:00  Check in at Hostel         ||         |
|          |     ||          🏨 MYR 35/night            ||         |
|          |     ||          📍 Thamel, Kathmandu       ||         |
|          |     ||                                     ||         |
|          |     ||   18:30  Evening walk — Thamel      ||         |
|          |     ||          🆓 Free                    ||         |
|          |     ||          💡 Best to go before dark  ||         |
|          |     ||                                     ||         |
|          |     |+-----------------------------------+|         |
|          |     |+-----------------------------------+|         |
|          |     ||  < 18–19 >          📖            ||         |
|          |     \\=====================================//         |
+------------------------------------------------------------------+
```

**Elements per day in export:**
- Day number, date, title, day total
- Per node: time, title, transport/price, tip, booking required
- No narrative/creative content — this is the practical plan only

---

## Screen D — Passport Map

```
+------------------------------------------------------------------+
|  [Mini-Map]                    [← Back to Book]    [👤 Angus]     |
+------------------------------------------------------------------+
|                                                                    |
|     +--------------------------------------------------------+    |
|     |                                                        |    |
|     |                     WORLD MAP                          |    |
|     |                 (Leaflet / Mapbox)                     |    |
|     |                                                        |    |
|     |              📍 Kathmandu, Nepal                       |    |
|     |                 Oct 2026 · 7 days                      |    |
|     |                 MYR 3,840                              |    |
|     |                                                        |    |
|     |       📍 Bangkok, Thailand                             |    |
|     |          Mar 2026 · 5 days                             |    |
|     |          MYR 2,100                                     |    |
|     |                                                        |    |
|     |                                                        |    |
|     |                                                        |    |
|     +--------------------------------------------------------+    |
|                                                                    |
|     ┌──────────────────────────────────────────────────────────┐  |
|     │ 🛂 PASSPORT STAMPS                                [2]    │  |
|     │                                                          │  |
|     │ 📍 Kathmandu, Nepal     Oct 2026   7 days   MYR 3,840   │  |
|     │ 📍 Bangkok, Thailand    Mar 2026   5 days   MYR 2,100   │  |
|     │                                                          │  |
|     └──────────────────────────────────────────────────────────┘  |
|                                                                    |
+------------------------------------------------------------------+
```

**Elements:**
- **Map area**: full-width world map (Leaflet/Mapbox) with GeoJSON stamp markers
- **Stamp markers**: clickable pins showing destination name + date + total spent
- **Stamp list panel** (bottom or side drawer):
  - Each stamp: destination, coordinates, completed date, total days, total spent
  - Count badge showing total stamps
- **Back button**: returns to the Book screen
- Empty state (no stamps yet): map shows world view with a prompt "Complete a journey to earn your first stamp"

---

## Error & Edge States (All Screens)

### Auth Errors
```
+------------------------------------------------------------------+
|          +---------------------------------------------+          |
|          |  ⚠️ Invalid email or password               |          |
|          |  [__________________________________]       |          |
|          +---------------------------------------------+          |
+------------------------------------------------------------------+
```

### API / Generation Errors (Book)
```
+------------------------------------------------------------------+
|          |     //=====================================\\         |
|          |     ||                                     ||         |
|          |     ||   ⚠️ Something went wrong           ||         |
|          |     ||                                     ||         |
|          |     ||   We couldn't generate Day 3.       ||         |
|          |     ||   Please try again.                 ||         |
|          |     ||                                     ||         |
|          |     ||   [ Retry ]   [ Go Back ]           ||         |
|          |     ||                                     ||         |
|          |     \\=====================================//         |
+------------------------------------------------------------------+
```

### Empty Passport
```
+------------------------------------------------------------------+
|     +--------------------------------------------------------+    |
|     |                                                        |    |
|     |              🛂 No stamps yet                          |    |
|     |                                                        |    |
|     |         Complete a journey to earn your                |    |
|     |         first passport stamp.                          |    |
|     |                                                        |    |
|     |              [ Start a Journey ]                       |    |
|     |                                                        |    |
|     +--------------------------------------------------------+    |
+------------------------------------------------------------------+
```

### Budget Exhausted Warning (Choice Card)
```
+------------------------------------------------------------------+
|          |     ||   ┌─────────────────────────┐       ||         |
|          |     ||   │ ⚠️ TIGHT BUDGET          │       ||         |
|          |     ||   │ This option uses 60% of  │       ||         |
|          |     ||   │ your remaining daily     │       ||         |
|          |     ||   │ budget.                  │       ||         |
|          |     ||   │ 💰 MYR 180               │       ||         |
|          |     ||   └─────────────────────────┘       ||         |
+------------------------------------------------------------------+
```
