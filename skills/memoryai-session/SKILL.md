---
name: memoryai-session
version: 1.2.0
description: Manages cross-session continuity and first-class session handoffs across Claude Code, Cursor, Codex, Gemini CLI, and MCP.
capabilities:
  - session-continuity
  - structured-handoff-generation
  - unfinished-work-tracking
  - next-action-synthesis
dependencies:
  - memoryai-project
  - memoryai-security
activation_conditions:
  - session-start
  - milestone-completion
  - session-end
tools_used:
  - memory_handoff_create
  - memory_handoff_get
security_requirements:
  - isolate-handoffs-by-project-and-user
---

# MemoryAI Session: Continuity & Structured Handoffs

The `memoryai-session` skill ensures multi-session task continuity by persisting and recalling compact structured handoffs.

## 🤝 Structured Handoff Schema

Instead of saving full conversation transcripts, generate a compact structured summary:

```json
{
  "objective": "Implement OAuth 2.0 PKCE flow in authentication service",
  "completed": [
    "Generated cryptographically secure code_verifier and code_challenge",
    "Configured Fastify auth pre-validation hook"
  ],
  "unfinished": [
    "Configure refresh token rotation retry loop",
    "Add Redis distributed token blacklist"
  ],
  "decisions": [
    "Standardized on SHA-256 for code_challenge generation"
  ],
  "knownIssues": [
    "Clock skew tolerance required on token expiration check"
  ],
  "relevantFiles": [
    "src/auth/pkce.ts",
    "src/auth/hooks.ts"
  ],
  "nextActions": [
    "Implement Redis token blacklist middleware",
    "Run unit tests for token expiration"
  ]
}
```

## 🔄 Lifecycle Protocol

1. **At Session Start:** Call `memory_handoff_get` to retrieve the latest active handoff for the detected project and resume work immediately.
2. **At Milestone / Session End:** Call `memory_handoff_create` with objective, completed work, unfinished tasks, and next suggested actions.
