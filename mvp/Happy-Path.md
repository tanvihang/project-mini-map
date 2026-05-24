# Mini-Map — MVP Happy Path

> This document defines the **exact scope** of the MVP happy path.  
> Backend engineers: if the step is not listed here, it is **out of scope** for submission.

---

## The Happy Path (7 Steps)

```
Step 1  User submits the input form
Step 2  System creates a Journey and generates Day 1 nodes
Step 3  Frontend renders Day 1 journal page
Step 4  System generates 4 choice cards for Day 2
Step 5  User selects one choice
Step 6  System generates Day N+1 nodes → repeat Steps 3–5
Step 7  Final day complete → user exports real plan
```

---

## Step 1 — User Initiates a Journey

**Frontend initiates chat to get data shown below（确认用户的输入）:**

* Notes - if user only provides destination, the agent should confirm all other fields below before proceeding to step 2.（注意，因为用户主要以对话框形式，所以是让用户用他们所写的内容，然后该api发送后如果发现不足够数据，可以反问用户以获取更多信息）

```json
POST /api/journeys

{
    "sessionId": "abc123", // Frontend generates a random sessionId for this journey, used for all subsequent calls
    "text": "Hi, I want to go to Kathmandu for 7 days. My budget is around $6000. I love photography, temples, and local food. I prefer a backpacker style trip."
}
```

**Backend should:**

1. Confirm all required data is present (destination, startDate, totalDays, totalBudget, **budgetCurrency**, travelStyle, interests). If not, ask user for missing info before proceeding.
2. **Normalize currency**: infer `budgetCurrency` (ISO 4217) from the user's text / locale (e.g., "$6000" + Malaysian locale → `MYR`; if ambiguous, ask). This becomes the journey's display currency and the anchor for the MultiCurrency `Money` model.
3. Retrieve the weather data through MCP for destination coordinates.
4. Retrieve the top 5 nearby POIs (Points of Interest) through MCP using Google Places API, and **upsert them into the `locations` cache** (with `geoPoint` + tags) so `$geoNear` can serve them in Step 4.
5. Fetch the destination's local currency + FX rate (Fixer.io) once, so every price captured later can be stored as a full `Money` document.
6. Create the first `journeys` document in **MongoDB** (`status: "ready"`, `currentDay: 0`, `remainingBudgetMinor = totalBudgetMinor`, storing budget as integer minor units).
7. Return shown below to frontend immediately — frontend shows loading state to prevent user waiting without feedback while backend generates Day 1 nodes in Step 2.

**Agent 1 应该返回给backend**

```json
{
    "userId": "user_abc123", // MVP we'll just let frontend set their own userId, no need register
    "destination": "Kathmandu, Nepal",
    "startDate": "2026-10-03",
    "totalDays": 7,
    "totalBudget": 6000,
    "budgetCurrency": "MYR", // normalized display currency (MultiCurrency anchor)
    "travelStyle": "backpacker", 
    "interests": ["photography", "temples", "local food"]
}
```

**Response to frontend:**

```json
{ 
    "journeyId": "j-001", 
    "destination": "Kathmandu, Nepal", 
    "startDate": "2026-10-03", 
    "totalDays": 7, 
    "totalBudget": 6000, 
    "budgetCurrency": "MYR", 
    "travelStyle": "backpacker", 
    "interests": ["photography", "temples", "local food"], 
    "status": "ready" 
}
```

---

## Step 2 — Generate Day 1 Nodes

**Trigger:** Immediately after journey is created (no user action needed).

**Backend calls Gemini Agent with PROMPT 2（旅行生成）:**

**Backend should:**

1. Send the day-generation prompt to the **Gemini** model via Google Cloud Agent Builder.
2. Parse and validate the JSON response against the `DayNodeResponse` schema (retry once on invalid JSON, then 500).
3. **Resolve prices**: for each node, take the local-currency price as integer minor units (`local.minorUnits`), convert to the journey's `budgetCurrency` via the cached FX rate, round to integer `display.minorUnits`, and store the full `Money` object (`display`, `local`, `fxRate`, `asOf`).
4. For each node, call **Voyage AI** to generate a 1024-dim embedding from `senses.story + " " + searchTags.join(" ")`.
5. Write all nodes to the `nodes` collection via the **MCP Server**.
6. Update the `journeys` document (integer math): `currentDay = 1`, `remainingBudgetMinor -= dayTotalMinor`, `visitedTags += all node searchTags`, `currentLocation = last node coordinates`, `status = "active"`.

**Response to frontend:**

> All money is a **`MoneyAmount`** — integer `minorUnits` plus the pre-split `major` / `minor` the UI renders (see [MultiCurrency](../System-Analysis.md#multicurrency-money-model)). MYR 81.00 → `minorUnits: 8100`.

```json
{
  "dayNumber": 1,
  "currency": "MYR",          // display currency for all amounts below
  "nodes": [ /* array of node documents */ ], 
  "dayTotal":        { "currency": "MYR", "exponent": 2, "minorUnits": 8100,   "major": 81,   "minor": "00" },
  "remainingBudget": { "currency": "MYR", "exponent": 2, "minorUnits": 591900, "major": 5919, "minor": "00" },
  "remainingDays": 6
}
```

---

## Step 3 — Frontend Renders Day 1

Frontend renders nodes from Step 2 response.

Frontend signals day-complete when user scrolls to bottom of the last node.

---

## Step 4 — Generate Choice Cards for Next Day

**Trigger:** Frontend calls after Day N renders completely.

**Frontend sends:**

```json
POST /api/journeys/:journeyId/choices

{ 
    "forDay": 2,
}
```

**Backend should:**

1. Fetch from the `journeys` document:
   - `currentLocation` (GeoJSON Point)
   - `remainingBudget` + `budgetCurrency`
   - `remainingDays`
   - `visitedTags`
   - `interests`

2. Run **$geoNear Aggregation** on the `locations` cache — keep only POIs reachable within 1 day (`maxDistance: 200000`; if the result is empty, expand to `400000`).

3. Run **Atlas Vector Search** over those candidates — exclude any whose tags overlap `visitedTags` (deduplication), and rank the rest by similarity to the user's `interests`.

4. Call **Gemini** with this prompt:

```
Generate exactly 4 travel choices for the next day of this journey.

Current state:
- Current location: {{currentLocation.name}} ({{lat}}, {{lng}})
- Remaining days: {{remainingDays}}
- Remaining budget: {{remainingBudget}} {{budgetCurrency}}
- Already visited experience types: {{visitedTags}}
- User interests: {{interests}}
- Nearby reachable destinations (from Atlas $geoNear): {{nearbyOptions}}

Rules:
- Each choice must be geographically reachable within 1 day from current location
- Each choice estimated cost must be ≤ (remainingBudget ÷ remainingDays) × 1.5
- No choice may repeat an experience type already in visitedTags
- Must include exactly these 4 types: one "move to new location", one "local activity",
  one "deep explore / attraction", one "slow day / stay"
- If remainingDays ≤ 2, one option must be "head toward departure city"
- Weight options matching user interests higher, but always include one "surprise" option

Output JSON array of exactly 4 choices:
[
  {
    "type": "move | activity | explore | slow",
    "title": "string (max 8 words)",
    "description": "2 sentences, vivid and specific",
    "estimatedCost": number,  // whole major-unit estimate (e.g. 120); backend converts to a MoneyAmount in minor units
    "travelTimeFromCurrent": "string (e.g. '1.5hr bus')",
    "destinationCoordinates": { "type": "Point", "coordinates": [lng, lat] },
    "destinationName": "string",
    "tags": ["string"],
    "isRecommended": boolean
  }
]
```

5. Write choices to MongoDB

6. Return choices to frontend

**MongoDB write:**

```json
// Collection: choices
{
  "_id": "ObjectId",
  "journeyId": "abc123",
  "forDay": 2,
  "choices": [ /* 4 choice objects */ ],
  "selectedIndex": null,
  "createdAt": "ISODate"
}
```

**Response to frontend:**

```json
{
  "forDay": 2,
  "currency": "MYR",
  "choices": [
    {
      "type": "explore",
      "title": "Boudhanath Stupa + Pashupatinath Temple",
      "description": "Two of Kathmandu's most powerful sacred sites in one day. A giant white stupa and an open-air cremation ground on the same riverbank — nothing prepares you for either.",
      "estimatedCost": { "currency": "MYR", "exponent": 2, "minorUnits": 12000, "major": 120, "minor": "00" },
      "travelTimeFromCurrent": "20min taxi",
      "destinationCoordinates": { "type": "Point", "coordinates": [85.3621, 27.7215] },
      "destinationName": "Boudhanath, Kathmandu",
      "tags": ["buddhism", "world-heritage", "spiritual", "photography"],
      "isRecommended": true
    }
    // ... 3 more choices
  ],
  "remainingBudget": { "currency": "MYR", "exponent": 2, "minorUnits": 591900, "major": 5919, "minor": "00" },
  "remainingDays": 6
}
```

---

## Step 5 — User Selects a Choice

**Frontend sends:**

```json
POST /api/journeys/:journeyId/select

{
    "forDay": 2,
    "selectedIndex": 0
}
```

**Backend should:**

1. Update the `choices` document: set `selectedIndex = 0`.
2. Update the `journeys` document:
   - `currentLocation` = selected choice's `destinationCoordinates`
   - `visitedTags` += selected choice's `tags`
3. Trigger **Step 2 logic** for the next day, using the selected choice as the seed.
4. Return the next day's nodes (same response shape as Step 2, including `currency`).

---

## Step 6 — Loop Days 2 → N

Repeat Steps 3–5 for each day until `completedDay === totalDays`.

On the final day:
- Do **not** generate choice cards
- Show "Your journal is complete" banner
- Show Export CTA

---

## Step 7 — Export Real Plan

**Frontend sends:**

```json
POST /api/journeys/:journeyId/export
```

**Backend must:**

1. Fetch all nodes for `journeyId` sorted by `dayNumber`, `orderInDay`
2. Run Aggregation to compute (all in the journey's `budgetCurrency`):
   - Total spent per category (`accommodation`, `food`, `transport`, `entry`, `other`)
   - Total spent vs budget
3. Format into a structured itinerary object
4. Return JSON for frontend to render

**Response:**

```json
{
  "journeyId": "abc123",
  "destination": "Kathmandu, Nepal",
  "dates": "Oct 3–10, 2026",
  "currency": "MYR",
  "totalSpent":  { "currency": "MYR", "exponent": 2, "minorUnits": 384000, "major": 3840, "minor": "00" },
  "totalBudget": { "currency": "MYR", "exponent": 2, "minorUnits": 600000, "major": 6000, "minor": "00" },
  "budgetByCategory": {
    "accommodation": { "currency": "MYR", "exponent": 2, "minorUnits": 52000, "major": 520, "minor": "00" },
    "food":          { "currency": "MYR", "exponent": 2, "minorUnits": 42000, "major": 420, "minor": "00" },
    "transport":     { "currency": "MYR", "exponent": 2, "minorUnits": 25000, "major": 250, "minor": "00" },
    "entry":         { "currency": "MYR", "exponent": 2, "minorUnits": 31000, "major": 310, "minor": "00" },
    "other":         { "currency": "MYR", "exponent": 2, "minorUnits": 14000, "major": 140, "minor": "00" }
  },
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-10-03",
      "title": "Arrival — Thamel District",
      "dayTotal": { "currency": "MYR", "exponent": 2, "minorUnits": 8100, "major": 81, "minor": "00" },
      "nodes": [
        {
          "time": "14:30",
          "title": "Land at Tribhuvan Airport",
          "address": "Kathmandu, Nepal",
          "price": "Free",
          "transport": "Taxi — 800 NPR (~MYR 44)",
          "tip": "Fixed-price taxi from official counter, avoid touts",
          "bookingRequired": false
        }
        // ...
      ]
    }
    // ...
  ]
}
```

**Also update MongoDB:**

```json
// Collection: nodes — add GeoJSON stamp to passport
// Collection: users
{
  "passport": {
    "stamps": [
      {
        "destination": "Kathmandu, Nepal",
        "coordinates": { "type": "Point", "coordinates": [85.3240, 27.7172] },
        "completedAt": "ISODate",
        "totalDays": 7,
        "totalSpent": { "currency": "MYR", "exponent": 2, "minorUnits": 384000, "major": 3840, "minor": "00" }
      }
    ]
  }
}
```

---

## API Summary

Every monetary field in a response is a **`MoneyAmount`** object — integer `minorUnits` plus the pre-split `major`/`minor` for display (MYR 44.00 → `{ minorUnits: 4400, major: 44, minor: "00" }`). The backend never uses floats for currency; all sums and the budget guard run in integer minor units. Captured node prices use the dual-currency **`Money`** type (`display` + `local` + `fxRate`) to preserve the original local price. See [MultiCurrency](../System-Analysis.md#multicurrency-money-model).

| Method | Endpoint                        | Step | Description                           |
| ------ | ------------------------------- | ---- | ------------------------------------- |
| `POST` | `/api/journeys`                 | 1    | Create journey, fetch external data   |
| `GET`  | `/api/journeys/:id/day/:dayNum` | 3    | Get all nodes for a day               |
| `POST` | `/api/journeys/:id/choices`     | 4    | Generate next-day choice cards        |
| `POST` | `/api/journeys/:id/select`      | 5    | User selects a choice, seeds next day |
| `POST` | `/api/journeys/:id/export`      | 7    | Generate real-plan export JSON        |
| `GET`  | `/api/users/:userId/passport`   | —    | Get passport stamps for world map     |

---

## MongoDB Collections Summary

| Collection  | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| `journeys`  | Journey metadata, current state, remaining budget/days        |
| `nodes`     | Every stop in every day — the core data                       |
| `choices`   | Generated choice cards per day, which was selected            |
| `users`     | User profile + passport stamps                                |
| `locations` | Backend-internal POI cache (from Google Places) for `$geoNear` |

---

## External APIs Required

| API                           | Used For                              | Free Tier         |
| ----------------------------- | ------------------------------------- | ----------------- |
| OpenWeather API               | 7-day forecast per destination        | 1,000 calls/day   |
| Google Places API             | Nearby POIs → cached in `locations`   | $200 credit/month |
| Hostelworld API / Booking.com | Real accommodation pricing            | Partner access    |
| Fixer.io                      | Display ↔ local currency FX rates     | 100 calls/month   |
| Freesound API                 | Ambient sound URLs per location       | Free              |
| Unsplash API                  | Reference photos per location         | 50 req/hour       |

---

## MongoDB Atlas Setup Checklist

```
☐ Create Atlas cluster (M0 free tier is fine for MVP)
☐ Enable Atlas Vector Search
   └── Index: nodes.embedding (1024-dim, Voyage AI)
☐ Enable Atlas Search
   └── Index: nodes (fields: senses.story, searchTags, location.name)
☐ Create 2dsphere index on locations.geoPoint
   └── Enables $geoNear queries for choice generation
☐ Create 2dsphere index on nodes.location.coordinates
   └── Powers the passport footprint map
☐ Apply $jsonSchema validators on journeys + nodes (incl. Money shape)
☐ Set up MongoDB MCP Server
   └── Connect to Gemini Agent Builder as a tool
☐ Get Voyage AI API key from MongoDB Atlas dashboard
```

---

## Gemini Agent Builder Setup Checklist

```
☐ Create Agent in Google Cloud Vertex AI Agent Builder
☐ Set model: latest Gemini Pro available in Agent Builder (do not pin a minor version)
☐ Register MCP tools:
   ├── create_node             (writes a node document to Atlas)
   ├── get_journey_state       (reads journey metadata)
   ├── get_visited_tags        (reads journey.visitedTags)
   ├── get_reachable_locations (runs $geoNear on the locations cache)
   └── update_journey          (updates currentLocation, remainingBudget, visitedTags)
☐ Set temperature: 0.7 (creative but consistent)
☐ Set max output tokens: 4096 (enough for 5-node day)
```

---

## Definition of Done (MVP)

The MVP is complete when a user can:

1. ✅ Fill the input form and see Day 1 render
2. ✅ Read all nodes with full senses, dialogue, and cultural tip
3. ✅ See 4 choice cards appear at the end of Day 1
4. ✅ Select a choice and see Day 2 render from that choice
5. ✅ Repeat through all 7 days with no repeat experience types
6. ✅ See the Export screen with budget breakdown by category
7. ✅ See their destination stamped on the passport map

### Out of Scope for MVP
- User authentication (use hardcoded `userId` for demo)
- Real photo upload / post-trip journal overlay
- `actual.*` fields (all remain null)
- Community / share features
- Historical travel mode
- Multi-language support
- Mobile app (web only)
- Ambient sound playback
- Real booking links (show placeholder)

---

## Error Handling (Minimum Required)

| Scenario                            | Expected Behaviour                                             |
| ----------------------------------- | -------------------------------------------------------------- |
| Gemini returns invalid JSON         | Retry once with same prompt, then return 500                   |
| External API timeout                | Use cached data from journey doc if available, else skip field |
| Budget exhausted before final day   | Force "slow day" choices only (low cost options)               |
| No reachable destinations found     | Expand search radius to 400km                                  |
| Choice generation returns < 4 types | Fill missing type with Gemini fallback prompt                  |