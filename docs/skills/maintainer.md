# `memoryai-maintainer` Skill

Self-improving engineering skill for inspecting MemoryAI codebase health, diagnosing technical debt, verifying test suites, and performing non-destructive improvements.

## Capabilities
1. **Repository Health Inspection:** Verifies monorepo builds, topological package ordering, and dependency health.
2. **Technical Debt Analysis:** Identifies unresolved TODOs, dead code, and unreferenced exports.
3. **Automated Diagnostic Execution:** Runs `memoryai doctor`, unit tests, and security tests.
4. **Non-Destructive Refactoring:** Applies safe, minimal patches with test validation.

## Tools Used
- `memory_status`
- `memory_embeddings_status`
