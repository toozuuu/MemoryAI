# `memoryai-core` Skill

The primary orchestrator skill for MemoryAI. It coordinates specialized memory capabilities across the agent lifecycle without requiring manual commands.

## When It Activates
- **Session Start / User Prompt:** Evaluates user intent to determine whether historical memory recall is beneficial or should be skipped for simple/generic queries.
- **Task Completion:** Triggers extraction and memory persistence for durable knowledge.

## Access & Capabilities
- Accesses current user prompt and detected workspace project ID.
- Delegates retrieval to `memoryai-retrieval` and `memoryai-session`.
- Enforces strict token budget limits ($\le 1000$ tokens).

## Tools Used
- `memory_auto_context`
- `memory_recall`
- `memory_remember`
- `memory_handoff_get`
