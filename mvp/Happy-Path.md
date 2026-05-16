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

1. Confirm all required data is present (destination, startDate, totalDays, totalBudget, travelStyle, interests). If not, ask user for missing info before proceeding.
2. Retrieve the weather data through MCP for destination coordinates
3. Retrieve the top 5 nearby POIs (Points of Interest) through MCP using Google Places API or any other relevant.
4. Currency conversion if able.
5. Create first `journey` document in **MongoDB**
6. Return shown below to frontend immediately — frontend shows loading state to prevent user waiting without feedback while backend generates Day 1 nodes in Step 2.

**Agent 1 应该返回给backend**

```json
{
    "userId": "user_abc123", // MVP we'll just let frontend set their own userId, no need register
    "destination": "Kathmandu, Nepal",
    "startDate": "2026-10-03",
    "totalDays": 7,
    "totalBudget": 6000,
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

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

1. Send prompt to **Gemini Model** via Google Cloud Agent Builder
2. Parse the JSON response
3. For each node: call **Voyage AI** to generate a 1024-dim embedding from `senses.story + searchTags.join(" ")` 
4. Write all nodes to MongoDB via **MCP Server**
5. Update `journey.currentDay = 1`, `journey.remainingBudget -= dayTotal`, `journey.visitedTags += all node searchTags`

**Response to frontend:**

```json
{
  "dayNumber": 1,
  "nodes": [ /* array of node documents */ ], 
  "dayTotal": 81,
  "remainingBudget": 5919,
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

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

1. Fetch from MongoDB:
   - `journey.currentLocation` (GeoJSON)
   - `journey.remainingBudget`
   - `journey.remainingDays`
   - `journey.visitedTags`
   - `journey.interests`

2. Run **Atlas Vector Search** — find destinations within ~200km radius that do NOT share tags with `visitedTags` (deduplication)

3. Run **$geoNear Aggregation** — filter only locations reachable within 1 day of travel from `currentLocation`

4. Call **Gemini** with this prompt:

```
Generate exactly 4 travel choices for the next day of this journey.

Current state:
- Current location: {{currentLocation.name}} ({{lat}}, {{lng}})
- Remaining days: {{remainingDays}}
- Remaining budget: {{remainingBudget}} CNY
- Already visited experience types: {{visitedTags}}
- User interests: {{interests}}
- Nearby reachable destinations (from Atlas): {{nearbyOptions}}

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
    "estimatedCost": number,
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
  "choices": [
    {
      "type": "explore",
      "title": "Boudhanath Stupa + Pashupatinath Temple",
      "description": "Two of Kathmandu's most powerful sacred sites in one day. A giant white stupa and an open-air cremation ground on the same riverbank — nothing prepares you for either.",
      "estimatedCost": 120,
      "travelTimeFromCurrent": "20min taxi",
      "destinationCoordinates": { "type": "Point", "coordinates": [85.3621, 27.7215] },
      "destinationName": "Boudhanath, Kathmandu",
      "tags": ["buddhism", "world-heritage", "spiritual", "photography"],
      "isRecommended": true
    }
    // ... 3 more choices
  ],
  "remainingBudget": 5919,
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

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

1. Update `choices` document: set `selectedIndex = 0`
2. Update `journey` document:
   - `currentLocation` = selected choice's `destinationCoordinates`
   - `visitedTags` += selected choice's `tags`
3. Trigger **Step 2 logic** for Day 2 using selected choice as the seed
4. Return Day 2 nodes (same response shape as Step 2)

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
2. Run Aggregation to compute:
   - Total spent per category (`food`, `transport`, `entry`, `accommodation`)
   - Total CNY spent vs budget
3. Format into a structured itinerary object
4. Return JSON for frontend to render

**Response:**

```json
{
  "journeyId": "abc123",
  "destination": "Kathmandu, Nepal",
  "dates": "Oct 3–10, 2026",
  "totalSpentCNY": 3840,
  "totalBudgetCNY": 6000,
  "budgetByCategory": {
    "accommodation": 520,
    "food": 420,
    "transport": 250,
    "entry": 310,
    "other": 140
  },
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-10-03",
      "title": "Arrival — Thamel District",
      "totalCNY": 81,
      "nodes": [
        {
          "time": "14:30",
          "title": "Land at Tribhuvan Airport",
          "address": "Kathmandu, Nepal",
          "price": "Free",
          "transport": "Taxi — 800 NPR (~¥44)",
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
        "totalSpentCNY": 3840
      }
    ]
  }
}
```

---

## API Summary

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

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

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

| Collection | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| `journeys` | Journey metadata, current state, remaining budget/days |
| `nodes`    | Every stop in every day — the core data                |
| `choices`  | Generated choice cards per day, which was selected     |
| `users`    | User profile + passport stamps                         |

---

## External APIs Required

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

| API                           | Used For                        | Free Tier         |
| ----------------------------- | ------------------------------- | ----------------- |
| OpenWeather API               | 7-day forecast per destination  | 1,000 calls/day   |
| Google Places API             | Nearby POIs to seed Gemini      | $200 credit/month |
| Hostelworld API / Booking.com | Real accommodation pricing      | Partner access    |
| Fixer.io                      | Live CNY ↔ local currency rates | 100 calls/month   |
| Freesound API                 | Ambient sound URLs per location | Free              |
| Unsplash API                  | Reference photos per location   | 50 req/hour       |

---

## MongoDB Atlas Setup Checklist

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

```
☐ Create Atlas cluster (M0 free tier is fine for MVP)
☐ Enable Atlas Vector Search
   └── Index: nodes.embedding (1024-dim, Voyage AI)
☐ Enable Atlas Search
   └── Index: nodes (fields: senses.story, searchTags, location.name)
☐ Create 2dsphere index on nodes.location.coordinates
   └── Enables $geoNear queries for choice generation
☐ Set up MongoDB MCP Server
   └── Connect to Gemini Agent Builder as a tool
☐ Get Voyage AI API key from MongoDB Atlas dashboard
```

---

## Gemini Agent Builder Setup Checklist

> Backend Architect Fill in details （以下是claude推荐的我保留，不确定对后端有没有用，可以自行调整）

```
☐ Create Agent in Google Cloud Vertex AI Agent Builder
☐ Set model: gemini-1.5-pro
☐ Register MCP tools:
   ├── create_node        (writes a node document to Atlas)
   ├── get_journey_state  (reads journey metadata)
   ├── get_visited_tags   (reads journey.visitedTags)
   └── update_journey     (updates currentLocation, remainingBudget, visitedTags)
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