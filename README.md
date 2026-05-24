# Mini-Map

> **Every journey is unique. Live yours virtually before spending a single cent.**

[![Hackathon](https://img.shields.io/badge/Hackathon-Google%20Cloud%20Rapid%20Agent-blue)](https://rapid-agent.devpost.com)
[![Track](https://img.shields.io/badge/Track-MongoDB%20Atlas-green)](https://www.mongodb.com/)
[![Powered by](https://img.shields.io/badge/Powered%20by-Gemini%20%2B%20Agent%20Builder-orange)](https://cloud.google.com/vertex-ai)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is Mini-Map?

Mini-Map is a **Gemini-powered travel agent** that turns destination exploration into an interactive, day-by-day virtual journal — built on realistic prices, real-time weather, and rich cultural data. Instead of dumping a static itinerary all at once, Mini-Map reveals your journey **one day at a time**, just like writing a real travel journal.

Each evening, you choose where tomorrow takes you. Every user's journal is different.

---

## The Problem

Most AI travel tools ask for your destination, dates, and interests — then generate a complete itinerary in one shot. You wait. You scroll. You forget most of it.

Real travel doesn't work like that. Real travellers make decisions **one day at a time**, shaped by energy, budget, what they've already seen, and unexpected moments.

Mini-Map closes that gap.

---

## The Techo Interaction Model

Mini-Map's core innovation is a **choice-driven, progressive journaling experience** — not a static plan generator.

```
User Input (once)
  └── destination · total days · total budget · travel style · interests

        ↓  Gemini generates Day 1 in full

[ Day 1 Journal Page renders completely ]
  └── time · location · real prices · 5-sense story · dialogues · cultural tips

        ↓  Day 1 complete → "Where will you go tomorrow?"

┌─────────────────────────────────────────────────────┐
│  Option A  Move to a new city        ~MYR95  🏙️       │
│  Option B  Experience a local activity ~MYR120 🥾     │
│  Option C  Deep-dive a historic site  ~MYR110 🏛️      │
│  Option D  Slow down, stay & wander   ~MYR40  😌      │
└─────────────────────────────────────────────────────┘

        ↓  User picks one → becomes the seed for Day 2

[ Day 2 Journal Page renders completely ]
  └── ... loop until the final day ...

[ Journal Complete → Convert to Real Executable Plan ]
```

Every choice is **geographically valid**, **within remaining budget**, and **contextually unique** — no repeated experience types, no impossible day trips. Each user's journal is genuinely their own.

---

## Core Features

### Virtual Travel Journal
Each day is a rich, multi-layered journal entry structured around a full data schema:

| Layer              | Fields                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Logistics**      | `time` · `date` · `location` (GeoJSON) · `transport` · `weather` · `price` (by category)  |
| **Five Senses**    | `see` · `hear` · `smell` · `taste` · `touch` · `mood`                                     |
| **Story**          | AI-generated first-person immersive narrative scoped to that exact moment                 |
| **Dialogue**       | Conversations with locals, fellow travellers, inner monologue — with speaker and language |
| **Cultural Layer** | `cultureTips` · `localPhrase` (with pronunciation) · `dosDonts`                           |
| **Practical**      | `openingHours` · `crowdLevel` · `bestTimeToVisit` · `photoTip` · `bookingRequired`        |
| **Media**          | Reference photos · `ambientSound` URL                                                     |

### Daily Choice Engine

At the end of each day, Gemini generates 3–4 forward options constrained by:
- **Geographic reachability** — only destinations reachable within one day's travel from the current GeoJSON position
- **Budget guard** — option cost ≤ (remaining budget ÷ remaining days) × 1.5
- **Deduplication** — already-visited `searchTags` are excluded via Atlas Vector Search
- **Type diversity** — always includes at least 3 different choice types (move / activity / explore / slow)
- **Interest weighting** — user preferences surface higher, but one "surprise" option is always included

### Real → Real Conversion
Once the virtual journey is complete, one click exports the full journal as an executable real-world itinerary.

### Virtual Passport
Every completed destination adds a GeoJSON stamp to the user's personal world map. The full journey history is stored in MongoDB Atlas and queryable across sessions.

---

## MongoDB Atlas — Full Ecosystem Integration

Mini-Map uses all five core MongoDB capabilities, each mapped to a specific product feature:

| MongoDB Tool                  | Role in Mini-Map |
| ----------------------------- | ---------------- |
| **MCP Server**                | The bridge between Gemini (in Agent Builder) and Atlas. Exposes typed tools — `get_reachable_locations`, `get_journey_state`, `create_node`, `update_journey` — so the agent reads and writes documents through validated schemas instead of raw queries. No custom middleware layer. |
| **GeoJSON + Atlas**           | Every node and passport stamp stores a GeoJSON `Point`. A `2dsphere` index + `$geoNear` restricts each day's choices to destinations physically reachable from where the user slept the night before — the geographic anti-hallucination guard. |
| **Voyage AI + Vector Search** | Each node's `senses.story` + `searchTags` is embedded into a 1024-dim vector. Vector Search matches the user's interest/aesthetic preferences to location "vibes" and powers **deduplication** — already-experienced node types are excluded from tomorrow's options. |
| **Atlas Search**              | A full-text index over the saved journal (`senses.story`, `searchTags`, `location.name`) makes a user's entire travel history searchable across every completed trip. |
| **Aggregation Pipeline**      | Computes budget analytics (spend grouped by category, the remaining-budget-per-day guard) and the final real-plan export. Also aggregates `visitedTags` to feed the dedup filter. |

### Node Document Schema

Each stop in a journey is a single MongoDB document in the `nodes` collection. Monetary values are never bare numbers — they use the embedded **`Money`** type so the system keeps both the user's display currency and the original local-currency figure (see [MultiCurrency](System-Analysis.md#multicurrency-money-model)).

```json
{
  "_id": "ObjectId",
  "journeyId": "ObjectId",
  "dayNumber": 1,
  "orderInDay": 0,
  "time": "14:30",
  "title": "Land at Tribhuvan International Airport",
  "location": {
    "name": "Tribhuvan International Airport",
    "address": "Ring Rd, Kathmandu 44600, Nepal",
    "coordinates": { "type": "Point", "coordinates": [85.3559, 27.6966] }
  },
  "transport": "Prepaid taxi from the official counter",
  "weather": { "condition": "Clear", "tempC": 22, "source": "OpenWeather" },
  "priceCategory": "transport",
  "price": {
    "amount": 44.0, "currency": "MYR",
    "localAmount": 800.0, "localCurrency": "NPR",
    "fxRate": 0.055, "asOf": "2026-10-03T08:00:00Z"
  },
  "senses": {
    "see": "Terraced hills folding into haze as the plane drops toward the valley.",
    "hear": "The clatter of the baggage belt, horns leaking through the doors.",
    "smell": "Diesel, incense, and dust — the first breath of Kathmandu.",
    "taste": "The metallic dryness of altitude on the back of your tongue.",
    "touch": "Warm vinyl seat of the taxi, the grit of the window crank.",
    "mood": "Equal parts exhaustion and disbelief that you actually came.",
    "story": "The doors slide open and Kathmandu arrives all at once..."
  },
  "dialogues": [
    {
      "speaker": "Taxi driver",
      "language": "ne",
      "text": "Thamel? Paltan ho, sajilo cha.",
      "translation": "Thamel? It's busy, but easy to reach."
    }
  ],
  "culture": {
    "cultureTips": ["Use the official prepaid taxi counter to avoid touts."],
    "localPhrase": { "phrase": "Namaste", "pronunciation": "nuh-muh-STAY", "meaning": "Hello / I bow to you" },
    "dosDonts": { "dos": ["Greet with both palms together"], "donts": ["Don't hand money with your left hand"] }
  },
  "practical": {
    "openingHours": "24h",
    "crowdLevel": "high",
    "bestTimeToVisit": "Daytime arrival for the valley view on descent",
    "photoTip": "Window seat on the left for the Himalaya line.",
    "bookingRequired": false
  },
  "media": {
    "referencePhotos": ["asset_f98c1b"],
    "ambientSound": "https://freesound.org/.../airport-ambient.mp3"
  },
  "searchTags": ["airport", "arrival", "thamel", "transfer"],
  "embedding": [0.0123, -0.0456, "... 1024 dims (Voyage AI)"],
  "createdAt": "ISODate"
}
```

---

## Architecture

The frontend never touches Atlas directly. It speaks structured JSON to the Next.js API layer, which orchestrates the Gemini agent; the agent reaches data **only** through the MongoDB MCP Server, which enforces the geographic and budget guards before any document is read or written.

```
┌─────────────────────────────────────────────────────────┐
│                     User (Web App)                      │
└───────────────────────┬─────────────────────────────────┘
                        │  structured JSON
┌───────────────────────▼─────────────────────────────────┐
│          Google Cloud Agent Builder                     │
│          Gemini Pro (latest via Agent Builder)          │
└──────┬────────────────┬────────────────┬────────────────┘
       │                │                │
  Real APIs      MCP Server        Vertex AI / Voyage AI
  (Weather,      (MongoDB          (1024-dim embeddings)
  Places,         Atlas)
  FX Rate)
       │                │                │
       └────────────────▼────────────────┘
                        │  validated tool calls only
┌───────────────────────▼─────────────────────────────────┐
│                  MongoDB Atlas                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  GeoJSON    │  │ Voyage AI +  │  │ Atlas Search  │  │
│  │  2dsphere   │  │ Vector Search│  │ (Journal full-│  │
│  │ (geoNear,   │  │ (vibe match  │  │  text search) │  │
│  │  passport)  │  │  + dedup)    │  └───────────────┘  │
│  └─────────────┘  └──────────────┘                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Aggregation Pipeline (budget-by-category,       │   │
│  │  remaining-per-day guard, real-plan export)      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Collections: journeys · nodes · choices · users        │
│               locations (POI cache for $geoNear)        │
└─────────────────────────────────────────────────────────┘
```

---

## MVP Scope

### Built for Submission
- [ ] Input form — destination, days, budget, style, interests
- [ ] Gemini Agent + Google Cloud Agent Builder setup
- [ ] MongoDB MCP Server integration
- [ ] Live API connections — weather, accommodation pricing, exchange rate
- [ ] Full node generation per day — senses, dialogue, cultural tips, practical info
- [ ] Choice engine — 3–4 contextually constrained daily direction options
- [ ] Day-by-day progressive web UI with expandable node detail
- [ ] Virtual passport with GeoJSON footprint map
- [ ] Voyage AI embeddings + Vector Search index for deduplication
- [ ] Budget tracker with Aggregation by spend category
- [ ] Real-plan export
- [ ] Atlas Search on saved journal history

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google Cloud project with Vertex AI enabled
- API keys: OpenWeatherMap, Hostelworld, Google Places, Fixer.io (FX)

### Installation

```bash
git clone https://github.com/tanvihang/project-mini-map.git
cd project-mini-map
yarn install
```

### Environment Variables

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
VERTEX_AI_LOCATION=us-central1
AGENT_BUILDER_AGENT_ID=your-agent-id

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/minimap
MONGODB_DB=minimap
VOYAGE_API_KEY=your-voyage-key          # issued from the Atlas dashboard

# External APIs
OPENWEATHER_API_KEY=your-key
GOOGLE_PLACES_API_KEY=your-key
FX_API_KEY=your-key                     # Fixer.io — drives MultiCurrency conversion
```

### Run

```bash
# Start the MongoDB MCP server (registered as a tool in Agent Builder)
yarn mcp:start

# Start the web app
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Why MongoDB for This?

Travel data is structurally complex and deeply variable — a night in a Kathmandu hostel and a sunrise hike in Nagarkot require completely different fields. MongoDB's flexible document model means we never fight the schema.

More specifically:

- **GeoJSON** makes the virtual passport map and geographic choice constraints trivial to implement
- **Voyage AI + Vector Search** lets users describe a feeling ("quiet, mountainous, spiritual") and find matching destinations — not keywords
- **Atlas Search** makes the full journal history searchable across all saved trips
- **Aggregation Pipeline** powers the budget analytics and the deduplication logic that keeps each day's choice options fresh
- **MCP Server** is the direct bridge between Gemini's reasoning and Atlas data — the agent reads and writes nodes without any custom middleware layer

---

## The Team

| Name | Role | GitHub |
|---|---|---|
| **Angus Tan** | Frontend Engineer | [@yourgithub](https://github.com) |
| **Lee See Chen** | Backend Architect | [@theirgithub](https://github.com) |
| **Yong Zhi** | Backend Engineer | [@theirgithub](https://github.com) |
| **Yee Siang** | AI Engineer | [@theirgithub](https://github.com) |

---

## License

MIT — see [LICENSE](LICENSE) for details.