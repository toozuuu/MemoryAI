---
name: memoryai
version: 1.2.0
description: "Universal autonomous long-term memory for AI agents. Remember everything, send only what matters."
capabilities:
  - autonomous-memory
  - session-continuity
  - project-isolation
  - token-bounding
dependencies:
  - memoryai-core
  - memoryai-session
  - memoryai-project
  - memoryai-retrieval
  - memoryai-capture
  - memoryai-security
  - memoryai-mcp
  - memoryai-maintainer
---

# MemoryAI: Modular Long-Term Memory System

MemoryAI provides autonomous persistent memory across Claude Code, Cursor, Codex, Gemini CLI, and MCP clients.

## 📦 Modular Skill Architecture

MemoryAI delegates specialized tasks to 8 modular skills:

1. **`memoryai-core`**: Primary task intent assessment and bounded context routing.
2. **`memoryai-session`**: Multi-day session continuity and structured handoff generation.
3. **`memoryai-project`**: Stable repository identity detection and strict project memory isolation.
4. **`memoryai-retrieval`**: Hybrid FTS5 + dense vector cosine search with token budget guarantees.
5. **`memoryai-capture`**: Autonomous durable knowledge extraction, brain decisions, and temporal invalidation.
6. **`memoryai-security`**: Non-executable `<MEMORY_DATA>` containers, prompt injection defanging, and anti-IDOR RBAC.
7. **`memoryai-mcp`**: Model Context Protocol tool routing and schema reference.
8. **`memoryai-maintainer`**: Self-improving codebase health inspection and automated diagnostic test execution.

## 🚀 Autonomous Developer Workflow

```text
Developer works normally (zero manual memory commands required)
       ↓
MemoryAI evaluates prompt & recalls relevant bounded context + latest handoff
       ↓
AI acts on bounded context
       ↓
Durable architectural choices and handoffs are captured automatically
```
