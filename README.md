<div align="center">
  <h1>MemoryAI</h1>
  <p><strong>Universal, Secure, Local-First Long-Term Memory Platform for AI Agents</strong></p>
  <p>Remember everything that matters. Retrieve only what matters.</p>

  <p>
    <a href="https://github.com/memoryai/memoryai/actions"><img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="CI Build" /></a>
    <img src="https://img.shields.io/badge/tests-89%2F89%20passing-brightgreen.svg" alt="Tests" />
    <img src="https://img.shields.io/badge/OWASP%20Security-100%25%20hardened-blue.svg" alt="Security" />
    <img src="https://img.shields.io/badge/MCP%202026-Tasks%20Extension-indigo.svg" alt="MCP 2026" />
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" /></a>
    <img src="https://img.shields.io/badge/node-%3E%3D22.0.0-informational.svg" alt="Node" />
  </p>

  <p>
    <a href="https://memoryai.github.io/memoryai/"><strong>Live Interactive Demo</strong></a> •
    <a href="#core-principle">Core Principle</a> •
    <a href="#key-highlights">Key Highlights</a> •
    <a href="#quickstart">Quickstart</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#event-driven-memory">Event-Driven Memory</a> •
    <a href="#progressive-disclosure">Progressive Disclosure</a> •
    <a href="#mcp-2026-tasks">MCP 2026 & Tasks</a> •
    <a href="#snapshots--versioning">Snapshots & Diffs</a> •
    <a href="#health--integrity">Health & Diagnostics</a> •
    <a href="#security--privacy">Security & Privacy</a> •
    <a href="#cli-reference">CLI Reference</a> •
    <a href="#testing--benchmarks">Testing</a>
  </p>
</div>

---

## Core Principle

> **MemoryAI provides effectively unlimited persistent memory by storing large amounts of durable knowledge locally and retrieving only a bounded, highly relevant subset for the LLM context.**

Traditional AI workflows dump raw conversation logs (80,000+ tokens) into the context window, causing high API costs, attention degradation, and prompt drift. **MemoryAI** operates as an autonomous cognitive layer that intercepts conversation events, extracts durable decisions, and dynamically layers context under strict token budgets:

```text
User Request / IDE Event
          ↓
  Event Normalizer (session.*, task.*, file.*, decision.*)
          ↓
  Policy Evaluator (ignore, observe, capture, review, immediate)
          ↓
  Memory Orchestrator (Two-Phase Writes & Privacy Redaction)
          ↓
  SQLite Engine (FTS5 BM25 + Dense Vectors + Version Ledger)
          ↓
  Hybrid Retrieval & Multi-Factor Reranking
          ↓
  Progressive Disclosure Context (Level 1 → Level 2 → Level 3 → Level 4)
          ↓
  Strict Token Budget (300 / 500 / 1,000 / 2,000 tokens)
          ↓
       LLM
```

---

## Key Highlights

- **Zero Manual Overhead:** MemoryAI automatically detects project identity via Git/package manifests, recalls relevant context, captures durable decisions, and generates session handoffs.
- **Universal Cross-Client Portability:** Normalized conversation events (`MemoryAIConversationEvent`) seamlessly bridge Claude Code, Cursor, Codex, Gemini CLI, ChatGPT, and MCP clients.
- **MCP 2026 Stateless Core & Tasks Extension:** Fully compatible with the MCP 2026 specification featuring stateless execution, explicit application handles (`memoryContextId`, `taskId`, `handoffId`, `snapshotId`), and background task management.
- **4-Tier Progressive Disclosure:** Context builds progressively—from **Level 1 (150-token summary)** and **Level 2 (canonical facts)** up to **Level 3 (supporting evidence)** and **Level 4 (conversation traces)**.
- **Memory Snapshots & Historical Diffs:** Take point-in-time project snapshots (`memoryai snapshot create`) and inspect historical diffs (`memoryai diff`) across architectural decisions.
- **Project Memory Health Diagnostics:** Real-time 0–100 health scoring evaluating freshness, confidence, conflict rate, provenance, and handoff completeness (`memoryai health`).
- **Privacy & Two-Phase Writes:** Automated detection and redaction of RSA private keys, AWS access keys, JWT tokens, connection strings, and PII before permanent storage.
- **Zero-Downtime Embedding Migrations:** Atomic shadow table vector indexing with safe rollback capabilities (`memoryai embeddings migrate`).
- **Portable `.memorypack` Format:** Export, backup, and restore persistent memories with SHA-256 integrity checks.

---

## Quickstart

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/memoryai/memoryai.git
cd memoryai

# Install dependencies and build monorepo packages
npm install
npm run build
```

### 2. Run the 14-Point Diagnostic Doctor

```bash
# Verify database, vector indexes, encryption, SSRF protection, and MCP tools
node cli/dist/bin.js doctor
```

### 3. Basic Usage (Remember & Recall)

```bash
# Store a durable architectural decision
node cli/dist/bin.js remember "Architectural decision: Standardized on Fastify v4 and SQLite with WAL mode" --type decision --importance 0.95

# Recall bounded context with a 500 token budget
node cli/dist/bin.js recall "Fastify and SQLite database decisions" --max-tokens 500
```

---

## Architecture

```
                         MemoryAI Platform
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
   AI Clients             MCP 2026 Layer           Local SDK & CLI
 (Claude, Cursor,       (Stateless HTTP/Stdio,    (Node, Shell, API)
  Gemini, Codex, GPT)     Explicit Handles)
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                ▼
                         Event Normalizer
               (session.*, task.*, file.*, memory.*)
                                │
                                ▼
                       Event Policy Engine
            (ignore, observe, capture, review, immediate)
                                │
                                ▼
                       Memory Orchestrator
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
Memory Brain &           Memory Job & Tasks       Progressive Context
Two-Phase Write Engine   (Async Long-Running)     (Level 1 - 4 Layers)
       │                        │                        │
       ▼                        ▼                        ▼
Privacy Classifier &     Integrity Checker &      Semantic Cache &
Selective Encryption     Health Monitor (0-100)   Model Router
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                ▼
                      SQLite Storage Engine
     (Memories, Vectors, Versions, Snapshots, Tasks, Events, Sync Queue)
```

---

## Event-Driven Memory

MemoryAI automatically reacts to IDE and agent lifecycle events rather than requiring manual intervention:

```bash
# Emit an event to the MemoryAI pipeline
node cli/dist/bin.js remember "Project migrated to Angular 21 with standalone components" --type decision
```

| Event Type | Policy Action | Default Handling |
| :--- | :--- | :--- |
| `architecture.changed` | `immediate` | Persisted immediately with high importance |
| `decision.created` | `capture` | Processed through Memory Brain evaluation |
| `dependency.changed` | `immediate` | Supersedes previous dependency versions |
| `handoff.created` | `capture` | Stored as structured session continuity record |
| `error.detected` | `review` | Quarantined in review queue if confidence is low |
| `file.changed` | `observe` | Tracked in local event log without context inflation |
| `session.started` | `observe` | Auto-detects project identity and prepares handoffs |

---

## Progressive Disclosure Context

Retrieve only the depth of information required for the current prompt:

- **Level 1 (Summary):** Bounded 150-token executive summary of objectives and key facts.
- **Level 2 (Canonical):** Deduplicated, high-importance memory records formatted in secure `<MEMORY_DATA>` containers.
- **Level 3 (Evidence):** Canonical records paired with source provenance, file links, and timestamp metadata.
- **Level 4 (Conversation):** Deep raw segment trace on explicit demand.

```bash
# Recall Level 1 summary context
node cli/dist/bin.js recall "OAuth architecture" --max-tokens 300
```

---

## MCP 2026 & Tasks Extension

MemoryAI provides a fully compliant MCP server over stdio for **Claude Desktop**, **Claude Code**, **Cursor**, **Codex**, and any MCP client.

### Core MCP Tools (30 Active Tools):
- `memory_auto_context`: Automatic project detection, intent evaluation, and bounded memory recall.
- `memory_recall`: Token-bounded hybrid retrieval.
- `memory_progressive_recall`: Multi-tiered progressive context disclosure.
- `memory_remember`: Autonomous durable memory capture.
- `task_create`, `task_get`, `task_cancel`, `task_list`: Non-blocking MCP 2026 Tasks extension for background jobs.
- `memory_snapshot_create`, `memory_snapshot_list`, `memory_snapshot_compare`: Point-in-time state management.
- `memory_diff`: Historical memory version comparison.
- `memory_health`: 0–100 Project Health score with diagnostic breakdown.
- `memory_review_queue`: Quarantined memory inspection and review.
- `memory_handoff_create`, `memory_handoff_get`: Multi-day session continuity.
- `memory_share`: Scoped permission-checked sharing.
- `memory_explain`, `memory_explain_capture`: Retrieval and capture diagnostic explanations.

---

## Snapshots & Versioning

```bash
# Create a point-in-time milestone snapshot
node cli/dist/bin.js snapshot create v1.0.0-release "Production release snapshot"

# List project snapshots
node cli/dist/bin.js snapshot list

# Compare two project snapshots
node cli/dist/bin.js snapshot compare snap_abc123 snap_def456

# View historical diff of a memory record
node cli/dist/bin.js diff mem_123 1 2
```

---

## Health & Diagnostics

```bash
# Check 0-100 Project Memory Health score and diagnostic breakdown
node cli/dist/bin.js health

# Scan for orphaned vectors, broken provenance, or duplicate hashes
node cli/dist/bin.js verify

# Run automated conservative self-healing repair
node cli/dist/bin.js repair

# Calculate token economics and cloud API cost savings
node cli/dist/bin.js cost

# Run sandbox memory policy simulation
node cli/dist/bin.js simulate balanced

# Disaster recovery mode
node cli/dist/bin.js recovery
```

---

## Security & Privacy Architecture

| Security Control | Implementation |
| :--- | :--- |
| **Privacy Classifier** | Automatically rejects/redacts private keys, AWS credentials, JWT tokens, database URIs, and PII |
| **Prompt Injection Shield** | Strict `<MEMORY_DATA>` non-executable sandboxing and instruction defanging |
| **Tenant & User Isolation (IDOR)** | Server-enforced tenant, user, and project authorization checks on every query and mutation |
| **SSRF Defense** | Validates URLs blocking loopback (`127.0.0.1`), RFC1918 private subnets, and cloud metadata (`169.254.169.254`) |
| **Storage Encryption** | AES-256-GCM authenticated encryption for sensitive content fields |
| **Rate Limiter** | In-memory sliding window token bucket rate limiter |
| **Archive Security** | Zip-slip directory traversal guards and decompression bomb ratio limits |

---

## CLI Reference

| Command | Description |
| :--- | :--- |
| `memoryai init` | Initialize local `.memoryai` database and encryption keys |
| `memoryai status` | Show local memory stats, project identity, and metrics |
| `memoryai remember <text>` | Store durable decision, preference, or fact |
| `memoryai recall <query>` | Retrieve bounded context with strict token limit |
| `memoryai search <query>` | Search memories with hybrid FTS & vector matching |
| `memoryai handoff <create\|show\|list>` | Manage structured session handoff records |
| `memoryai snapshot <create\|list\|compare>` | Manage point-in-time project snapshots |
| `memoryai diff <id> <v1> <v2>` | Compare historical versions of a memory record |
| `memoryai health` | Project memory health score (0–100) |
| `memoryai verify` | Scan database for integrity issues |
| `memoryai repair` | Conservative automated integrity repair |
| `memoryai cost` | Calculate cloud token reduction and cost savings |
| `memoryai simulate [policy]` | Run sandbox policy simulation |
| `memoryai doctor` | Run 14-point system diagnostics |
| `memoryai security-check` | Verify security hardening posture |
| `memoryai export [file.memorypack]` | Export memories to portable `.memorypack` bundle |
| `memoryai import <file.memorypack>` | Import memories from `.memorypack` bundle |

---

## Testing & Verification

```bash
# Run all 89 unit, integration, memory, retrieval, MCP, concurrency, and performance tests
npm test

# Run all 22 OWASP API Top 10 and Privacy Security tests
npm run test:security

# Run combined full test suite
npm run test:all
```

---

## License

MIT License. Copyright (c) 2026 MemoryAI Contributors.