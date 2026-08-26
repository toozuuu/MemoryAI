# `memoryai-project` Skill

Resolves stable project identity and enforces strict project-scoped memory isolation to prevent cross-repository contamination.

## When It Activates
- **Project Open / Context Recall / Memory Storage:** Identifies the active repository using git remotes, package manifests, or workspace root hashes.

## Isolation Guarantees
- Project A memories never appear in Project B.
- Global user preferences remain available across all projects for that user.
- Cross-project sharing requires explicit authorization via `memoryai share`.

## Tools Used
- `memory_status`
- `memory_auto_context`
