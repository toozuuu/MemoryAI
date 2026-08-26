# `memoryai-capture` Skill

Automatically extracts durable knowledge, makes deterministic brain decisions, and preserves temporal history.

## Brain Actions
- **`CREATE`**: New durable knowledge stored as active.
- **`UPDATE`**: In-place content update for existing memory ID.
- **`CONFLICT`**: Invalidation of old state (`valid_to = now`) and creation of new state (`valid_from = now`).
- **`SUPERSEDE`**: Historical superseding with parent link.
- **`IGNORE`**: Discarding transient chatter.
- **`ARCHIVE`**: Marking deprecated state as archived.

## Tools Used
- `memory_remember`
- `memory_update`
