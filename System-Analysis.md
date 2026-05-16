# System Analysis for Project Mini Map

|**Version**|**Date**|**Author**|**Description**|
|:---:|:---:|:---:|:---:|
|V1.0.0|2026-05-17|[SeeChen Lee](mailto:[leeseechen@gmail.com])|Initial version|

## Overview
### Terminology
对于一个由非 AI 背景成员组成的黑客松团队，第一段的 **Overview & Terminology（术语表）** 至关重要。它不仅是项目文档的门面，更是为了让团队所有人**在同一个语境下（Align）对话**。

目前你的文档有两个地方急需优化：

1. **部分定义尚未完成：** 比如 Tools, Rules, Contexts, Token 的句子在句尾断掉了（"defined as the" 后面没有内容）。
2. **概念有些重叠或抽象：** 非 AI 同学很难区分 Skills 和 Tools 的区别，也很难理解 Token 和 Rule 是怎么在 Google Agent Builder 里运作的。

为了让非 AI 同学的逻辑更清晰，建议使用 **“人” 与 “工具箱” 的具象化比喻** 来重写这段定义，同时紧扣 Google Cloud Agent Builder 和 MCP 的技术本质。

以下是优化后的版本，你可以直接应用到你的系统分析文档中：

---

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

### System Architecture