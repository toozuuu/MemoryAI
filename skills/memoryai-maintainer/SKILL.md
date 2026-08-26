---
name: memoryai-maintainer
version: 1.2.0
description: Self-improving engineering skill for inspecting MemoryAI codebase quality, diagnosing technical debt, verifying test suites, and performing non-destructive improvements.
capabilities:
  - codebase-health-inspection
  - technical-debt-diagnosis
  - test-suite-verification
  - non-destructive-refactoring
dependencies:
  - memoryai-core
  - memoryai-security
activation_conditions:
  - maintenance-requested
  - doctor-run
  - pull-request-review
tools_used:
  - memory_status
  - memory_embeddings_status
security_requirements:
  - never-execute-destructive-deletions-without-confirmation
  - ensure-all-tests-and-security-checks-pass
---

# MemoryAI Maintainer: Self-Improving Engineering Agent

The `memoryai-maintainer` skill continuously inspects and improves the MemoryAI codebase.

## 🔍 Inspection Dimensions

1. **Architecture & Monorepo Health:** Validates topological build order across all 11 packages and 6 adapters.
2. **Technical Debt & Dead Code:** Searches for unresolved TODOs, obsolete mocks, and unreferenced exports.
3. **Security Posture:** Verifies OWASP API Top 10 compliance, input validation, SSRF checks, and secret absence.
4. **Embedding Index Health:** Validates vector count vs total memories and detects required model migrations.
5. **Skill Registry Validation:** Enforces YAML frontmatter schema, markdown structure, and circular dependency absence.

## 🛠 Improvement Protocol

```text
Inspect Codebase & Diagnostics
             ↓
Reason about Root Cause & Options
             ↓
Apply Minimal, Non-Destructive Patch
             ↓
Execute Test Suites (Unit, E2E, Security)
             ↓
Verify Backward Compatibility & Final Review
```
