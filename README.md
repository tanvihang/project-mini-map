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

> TODO: Backend Architect to fill in the specific role of each MongoDB tool in the Mini-Map architecture here.

| MongoDB Tool                  | Role in Mini-Map |
| ----------------------------- | ---------------- |
| **MCP Server**                |                  |
| **GeoJSON + Atlas**           |                  |
| **Voyage AI + Vector Search** |                  |
| **Atlas Search**              |                  |
| **Aggregation Pipeline**      |                  |

### Node Document Schema

Each stop in a journey is a single MongoDB document:

```json
{
    //TODO Backend Architect to fill in the example schema here
}
```

---

## Architecture

> TODO: Backend Architect to verify and refine, this is an example only

```
┌─────────────────────────────────────────────────────────┐
│                     User (Web App)                      │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│          Google Cloud Agent Builder                     │
│          Gemini 1.5 Pro                                 │
└──────┬────────────────┬────────────────┬────────────────┘
       │                │                │
  Real APIs      MCP Server        Vertex AI
  (Weather,      (MongoDB          (Embeddings)
  Hostelworld,    Atlas)
  Google Places,
  FX Rate)
       │                │                │
       └────────────────▼────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                  MongoDB Atlas                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  GeoJSON    │  │ Voyage AI +  │  │ Atlas Search  │  │
│  │  (Passport  │  │ Vector Search│  │ (Journal full-│  │
│  │   Map)      │  │ (Semantic    │  │  text search) │  │
│  └─────────────┘  │  discovery)  │  └───────────────┘  │
│                   └──────────────┘                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Aggregation Pipeline (Budget analytics,         │   │
│  │  travel patterns, destination recommendations)   │   │
│  └──────────────────────────────────────────────────┘   │
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


# MongoDB Atlas


# External APIs

```

### Run

```bash
# Start the MCP server

# Start the web app
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Why MongoDB for This?

> TODO: Backend Architect

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