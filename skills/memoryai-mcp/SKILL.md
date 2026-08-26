---
name: memoryai-mcp
version: 1.2.0
description: Model Context Protocol (MCP) server integration guidelines and tool reference for Claude Desktop, Claude Code, Cursor, and Codex.
capabilities:
  - mcp-stdio-transport
  - mcp-tool-routing
  - tool-input-validation
dependencies:
  - memoryai-core
  - memoryai-security
activation_conditions:
  - mcp-client-connection
tools_used:
  - memory_auto_context
  - memory_recall
  - memory_remember
  - memory_handoff_create
  - memory_handoff_get
  - memory_share
  - memory_embeddings_status
  - memory_search
  - memory_update
  - memory_forget
  - memory_status
security_requirements:
  - validate-all-tool-inputs-via-zod
  - rate-limit-mcp-calls
---

# MemoryAI MCP: Model Context Protocol Reference

The `memoryai-mcp` skill manages stdio-based MCP tool routing and input schema validation.

## 🛠 Available MCP Tools

1. **`memory_auto_context`**: Autonomous intent check, handoff retrieval, and bounded memory recall.
2. **`memory_recall`**: Query-based token-bounded retrieval.
3. **`memory_remember`**: Save or update durable preferences, decisions, and facts.
4. **`memory_handoff_create`**: Record structured session handoffs.
5. **`memory_handoff_get`**: Fetch the most recent project handoff.
6. **`memory_share`**: Create scoped shares across projects or teammates.
7. **`memory_embeddings_status`**: Inspect vector index health and migration readiness.
8. **`memory_search`**: Hybrid keyword and semantic search.
9. **`memory_update`**: Update content or importance of an existing record.
10. **`memory_forget`**: Permanently remove a record.
11. **`memory_status`**: System health and token metrics.
