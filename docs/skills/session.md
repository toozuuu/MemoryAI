# `memoryai-session` Skill

Manages multi-day session continuity by persisting and recalling structured handoff summaries.

## When It Activates
- **Session Start:** Recalls the most recent session handoff for the active repository.
- **Milestone Completion / Session End:** Automatically generates a structured handoff containing objective, completed items, unfinished tasks, decisions, and next steps.

## Handoff Schema
```json
{
  "objective": "Current task objective",
  "completed": ["Item 1", "Item 2"],
  "unfinished": ["Item 3"],
  "decisions": ["Architectural choices"],
  "knownIssues": ["Bugs or blockers"],
  "relevantFiles": ["Modified files"],
  "nextActions": ["Next suggested tasks"]
}
```

## Tools Used
- `memory_handoff_create`
- `memory_handoff_get`
