# System Analysis for Project Mini Map

|**Version**|**Date**|**Author**|**Description**|
|:---:|:---:|:---:|:---:|
|V1.0.0|2026-05-17|[SeeChen Lee](mailto:[leeseechen@gmail.com])|Initial version|

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
> TODO: Angus Tan

## System Requirements Analysis
### Scope of Requirements
### Use Case Analysis
> TODO: Angus Tan

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