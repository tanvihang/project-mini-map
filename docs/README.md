# Mini-Map Documentation

The authoritative product and engineering specs for Mini-Map. These live on the
**`docs` branch** only (code branches stay code-only).

## Product

| Doc | Purpose |
| --- | --- |
| [System Analysis](product/System-Analysis.md) | Requirements, use cases, architecture, data-model overview, API schemas |
| [Happy Path](product/Happy-Path.md) | The exact MVP scope — 7-step flow, endpoints, setup checklists |

## Engineering

| Doc | Purpose |
| --- | --- |
| [Data Models](engineering/Data-Models.md) | Authoritative MongoDB schemas, relationships, indexes (the source of truth for money/geo shapes) |
| [Backend Coding Standards](engineering/Backend-Coding-Standards.md) | Money / geo / validation / error-contract rules for all backend code |
| [MCP Tools](engineering/MCP-Tools.md) | The five MCP tool contracts the agent calls |
| [Prompt Engineering](engineering/Prompt-Engineering.md) | System prompts & scenario templates |
| [Testing Plan](engineering/Testing-Plan.md) | Geo / vector / money / contract test strategy |

## Conventions

- **Money** is integer minor units; never floats. See Data-Models §1 and Backend Coding Standards §1.
- **GeoJSON** coordinates are always `[longitude, latitude]`.
- Read order for a new backend contributor: System Analysis → Data Models → Backend Coding Standards → MCP Tools → Testing Plan.
