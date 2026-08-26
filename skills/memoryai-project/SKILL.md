---
name: memoryai-project
version: 1.2.0
description: Resolves stable project identity and enforces strict project-scoped memory isolation to prevent cross-repository contamination.
capabilities:
  - stable-project-detection
  - git-remote-normalization
  - project-scope-isolation
  - cross-project-leak-prevention
dependencies:
  - memoryai-security
activation_conditions:
  - project-open
  - memory-recall
  - memory-store
tools_used:
  - memory_status
  - memory_auto_context
security_requirements:
  - strict-project-boundary-isolation
  - prevent-cross-project-leakage
---

# MemoryAI Project: Stable Identity & Project Isolation

The `memoryai-project` skill detects repository identity deterministically and isolates project memories.

## 🆔 Stable Project Identity Resolution

Project identity is resolved deterministically from:
1. **Git Remote URL:** Normalized across SSH (`git@github.com:...`) and HTTPS (`https://github.com/...`) formats.
2. **Package Manifest:** `package.json`, `Cargo.toml`, `pyproject.toml`, or `go.mod` project name.
3. **Workspace Root Hash:** Deterministic hash of the directory structure.

Moving or cloning the same repository to a new directory maps to the **exact same project memory**.

## 🛡 Strict Isolation Guarantee

- **Project A memory NEVER leaks to Project B:** Queries in Project B only retrieve global user preferences and Project B-scoped memories.
- **Cross-project sharing:** Only occurs when explicitly authorized via `memoryai share` or `memory_share`.
