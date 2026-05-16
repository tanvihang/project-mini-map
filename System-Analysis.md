# System Analysis for Project Mini Map

| **Version** |  **Date**  |                  **Author**                  | **Description** |
| :---------: | :--------: | :------------------------------------------: | :-------------: |
|   V1.0.0    | 2026-05-17 | [SeeChen Lee](mailto:[leeseechen@gmail.com]) | Initial version |
|   V1.0.1    | 2026-05-17 |   [Angus Tan](mailto:[tvhang7@gmail.com])    | Filled in Background & Use Cases |

## Overview
### Terminology
| Term | Full Name / Reference | Description (Conceptual & Practical) | Analogy / Metaphor |
| :---: | :---: | :--- | :---: |
| **MCP** | Model Context Protocol <br/> [Official Docs](https://modelcontextprotocol.io/docs/) | An open-standard protocol. Acting like a **universal socket**, it allows AI models (e.g., Gemini) to securely and standardly connect to external data sources (e.g., MongoDB) and enterprise tools (e.g., GitLab), breaking down data silos. | **Universal Interface / Socket** |
| **Agent** | AI Agent | An AI system with the capability to think, plan, and execute tasks autonomously. In this project, it serves as the virtual travel and photography recommendation "brain" powered by deterministic logic. | **Your "Virtual Avatar" on a Trip** |
| **Tools** | Agent Tools | Specific external functions or APIs that the Agent can invoke. Examples include calling Google Maps for location data, querying APIs for real-time ticket prices, or fetching data from MongoDB. | **The "Toolbox" in the Avatar's Hands** (Compass, calculator, notepad) |
| **Skills / Playbooks** | Agent Capabilities | In Google Agent Builder, a Skill usually refers to a **Playbook (workflow)**. It defines the logical steps for the Agent to solve specific, complex problems. For example: "How to handle budget overruns" or "How to map out the golden hour photography route." | **The Avatar's "Standard Operating Procedures (SOP)"** |
| **Rules** | Agent Rules | Hard boundary conditions that restrict and regulate the Agent's behavior and responses. For example: "Never recommend hotels that exceed the user's budget" or "The output itinerary must strictly follow the structured format." | **The "Laws / Commandments" the Avatar must obey** |
| **Contexts** | Context Window / Session | All background information and real-time states held by the Agent in the current conversation. This includes the user's current virtual location, aesthetic preferences (e.g., film style), chat history, and the real-time weather just fetched via MCP. | **The Avatar's "Short-Term Memory" and current surroundings** |
| **Token** | LLM Token | The basic unit of language processed by an AI model (a word or a Chinese character typically corresponds to 1–2 tokens). Both input and output for large language models are billed by tokens. In our design, we need to utilize database caching to minimize redundant token consumption. | **The "Fuel / Cost" consumed when the Avatar thinks and speaks** |

### Background

#### The Problem

Travel planning is broken in a specific and underappreciated way.

The problem is not a lack of information. Travellers today have access to more destination data than any generation before them — review platforms, travel blogs, short-form videos, AI itinerary generators, curated newsletters. The volume of content is overwhelming. Yet despite this abundance, a consistent pattern persists: **people collect destinations and never go.**

They save Instagram posts. They bookmark Notion pages. They ask ChatGPT to generate a 7-day Tokyo itinerary, read the first two days, and close the tab. The trip never gets booked.

The root cause is not laziness. It is **decision paralysis driven by incomplete experience**. A traveller cannot confidently commit to a trip — the time, the money, the logistics — based on a list of bullet points and a set of stock photos. They cannot feel whether Kathmandu will overwhelm them or inspire them. They cannot know if their budget will hold. They cannot anticipate whether the cultural gap will feel exciting or exhausting. The information exists, but the *experience* of understanding does not.

This gap — between knowing about a destination and feeling ready to go — is where most travel intent dies.

#### How Current Solutions Fall Short

| Category | Examples | Core Limitation |
|---|---|---|
| Review platforms | TripAdvisor, Google Maps | Fragmented, user-generated, no narrative thread |
| AI itinerary generators | ChatGPT, Gemini, Klook AI | Generates a static plan all at once; user is passive reader |
| Virtual tour apps | Google Arts & Culture, YouTube VR | Curated footage, not personalised; no budget or logistics layer |
| Travel planning tools | Google Trips, Wanderlog | Organises what you already know; does not help you decide |

The most telling gap is in the AI itinerary generator category. These tools treat the user as a reader: they consume a completed plan. There is no agency, no progressive discovery, and no emotional investment in the outcome. The plan is forgotten almost as quickly as it is generated.

None of these tools answer the traveller's real question: **"Will I actually enjoy this trip — and can I afford it?"**

#### Market Context

- The global travel market was valued at **USD 9.5 trillion** in 2023 and is projected to reach USD 15.5 trillion by 2033 (Precedence Research, 2024).
- **73% of travellers** report experiencing decision anxiety when choosing a destination, often abandoning the planning process entirely (Booking.com Travel Report, 2023).
- **AI-assisted travel planning** is the fastest-growing category in travel tech, with consumer adoption growing 340% year-over-year since 2022.
- The **solo travel market** alone — a segment that indexes highly for planning anxiety and cultural uncertainty — is valued at USD 870 billion globally.
- Budget travellers and backpackers represent a disproportionately high-intent segment: they plan further in advance and consume more pre-trip content than any other cohort.

#### The Mini-Map Thesis

Mini-Map is built on a single insight: **the best way to commit to a trip is to take it first.**

Not in VR. Not as a passive video. As an interactive, choice-driven, multi-sensory journal — grounded in real prices, real weather, real cultural data — that unfolds one day at a time, exactly as a real journey would.

The mechanism matters. Rather than generating a complete 7-day plan and presenting it all at once, Mini-Map reveals the journey progressively. Each day renders fully before the next begins. At the end of each day, the user makes a real decision: where to go tomorrow. These choices are constrained by geography, budget, and the experiences they have already accumulated — mirroring exactly the mental process of a traveller in the field.

The result is a travel journal that is genuinely the user's own. No two journals are identical. And crucially, by the time the virtual journey ends, the user has already made seven days of travel decisions. The real trip feels less like a leap of faith and more like a return.

#### Why an Agent Architecture?

The depth of data required for a genuinely useful virtual travel experience — live weather, real accommodation pricing, geographically accurate suggestions, multi-sensory narrative, culturally accurate dialogue — cannot be produced by a single model call. It requires a coordinated agent that can:

1. Query multiple external APIs in parallel
2. Reason about geographic constraints (what is reachable from here, within one day?)
3. Track state across multiple sessions (what has the user already experienced?)
4. Generate constrained creative output (produce options that are varied, budget-safe, and non-repetitive)
5. Persist all of this in a structured, queryable database

Google Cloud's **Agent Builder** with **Gemini 2.5 Pro** provides the reasoning layer. **MongoDB Atlas** — via MCP Server, GeoJSON, Vector Search, Atlas Search, and Aggregation — provides the data layer. Together, they make it possible to produce a travel journal that is both deeply personal and factually grounded.

---

## System Requirements Analysis
### Scope of Requirements

### Use Case Analysis

#### Use Case 1 — Pre-Trip Virtual Exploration

**Primary actor:** Persona A — The Hesitant Planner  
**Goal:** Experience a destination in enough depth to make a confident booking decision

**Preconditions:**

- User has a destination in mind but has not booked
- User has a rough budget and time frame
- No prior Mini-Map account required

**Main Flow:**

1. User enters destination (Kathmandu), 7 days, MYR 6,000 budget, interests: temples and photography
2. Gemini Agent generates Day 1 — arrival, check-in, first evening walk — with real prices and immersive narrative
3. User reads the Day 1 journal: the taxi ride, the smell of the street, the conversation with the hostel owner
4. End of Day 1: user is presented with 4 choices for Day 2
5. User selects "Boudhanath Stupa + Pashupatinath Temple"
6. Day 2 generates: the stupa at dawn, a Tibetan monk's words, the river ceremony
7. User continues through all 7 days, each shaped by their own choices
8. At the end: total estimated cost MYR 3,840. Budget: MYR 6,000. The gap becomes the shopping and upgrade fund.
9. User books the trip.

**Value delivered:**

- Converts abstract interest into felt experience
- Answers the core question: "Will I enjoy this?"
- Produces a real budget estimate, not a guess
- The completed virtual journal becomes the trip plan

---

#### Use Case 2 — Budget Validation Before Booking

**Primary actor:** Persona B — The Budget-Conscious Backpacker  
**Goal:** Verify that a planned budget is realistic before committing to flights

**Preconditions:**

- User has a fixed budget ceiling
- User wants to travel backpacker-style
- User is uncertain whether their budget will cover the full trip

**Main Flow:**

1. User enters Kathmandu, 7 days, MYR 5,000 budget, backpacker style
2. Day 1 generates with real hostel prices (MYR 65/night via API), real meal costs (street food MYR 8–20 per meal), real transport costs
3. Budget tracker updates after each day: remaining budget visible at all times
4. At Day 3 choice generation, the budget constraint fires: Gemini excludes options costing more than (MYR 3,200 ÷ 4 days) × 1.5 = MYR 1,200 per day
5. One choice card is flagged: "⚠️ Tight — this option uses 60% of your remaining daily budget"
6. User can see exactly which categories are consuming budget (accommodation 22%, transport 18%, entry fees 24%)
7. User realises entry fees are the budget killer — adjusts interest preferences toward free/low-cost sites
8. Final summary: MYR 4,650 estimated for 7 days. Feasible. User books.

**Alternate flow — budget insufficient:**
- At Day 4 the system projects: "At this rate, you will exceed budget by MYR 800 on Day 7"
- System suggests: switch 2 nights from hostel to homestay (saves MYR 60), remove one paid attraction
- User adjusts plan or increases budget

**Value delivered:**
- Real cost validation before any money is spent
- Category-level breakdown identifies where to cut
- Budget constraint shapes the experience — not as a limitation but as a guide

---

#### Use Case 3 — Cultural Preparation for Solo Travel

**Primary actor:** Persona C — The Solo Traveller  
**Goal:** Understand cultural norms, social dynamics, and contextual behaviour before arriving

**Preconditions:**
- User is travelling solo, likely for the first time to this region
- User has standard destination knowledge but wants depth beyond tourist tips

**Main Flow:**

1. User enters Kathmandu, 10 days, MYR 8,000, solo traveller, interests: local culture, food, photography
2. Day 1 generates — arrival node includes:
   - `localPhrase`: Namaste with pronunciation guide
   - `dosDonts`: how to greet, how to handle tipping, what not to do with your left hand
   - `dialogues`: a realistic conversation with the taxi driver in broken English + Nepali
   - `cultureTips`: visa etiquette, photography rules at religious sites
3. Pashupatinath node (Day 2) includes:
   - Dialogue with a monk explaining the cremation ceremony — what it means, why it is public
   - Cultural tip: non-Hindus observe from the opposite riverbank only
   - `dosDonts`: no pointing with feet, do not photograph the funeral pyre
4. User arrives in Nepal having already "had" these conversations virtually
5. In practice: user uses the Namaste phrase correctly on Day 1, receives a warm response, confidence established

**Value delivered:**

- Replaces generic "cultural tips" lists with contextual, narrative knowledge
- Prepares user for specific moments, not abstract principles
- Reduces the anxiety of cultural misreadings that can sour a first solo trip

---

#### Use Case 4 — Accessible Travel for the Constrained Dreamer

**Primary actor:** Persona D — The Constrained Dreamer  
**Goal:** Experience genuine cultural exploration of a place they cannot physically visit

**Preconditions:**
- User cannot travel due to health, visa, finances, or caregiving responsibilities
- User wants meaningful engagement, not shallow entertainment

**Main Flow:**

1. User enters Marrakech, Morocco — a destination with high visa difficulty for many passport holders
2. Journal generates: the Djemaa el-Fna square at sunset, the smell of ras el hanout and charcoal, the call to prayer echoing between minarets
3. User chooses to spend Day 2 in the souks rather than moving to Essaouira
4. The medina node generates a conversation with a carpet merchant — his family history, three generations in the same shop, the difference between machine and hand-knotted wool
5. User adds the journey to their passport — a stamp for a country they have never entered
6. Six months later: visa situation resolves. User opens their Mini-Map journal and uses it directly as the basis for the real trip plan.

**Value delivered:**
- Genuine cultural depth, not a tourism brochure
- Creates a persistent record that becomes useful if circumstances change
- Respects the user's intelligence — immersive content, not condescension

### System Dependency Analysis

## System Design
### System Architecture
### System Data Model
### System Algorithm

## Implementation Details
### System Interface
### System API
### System Database
### System Algorithm
### System Testing Analysis

## Schedule 
## Risk Analysis