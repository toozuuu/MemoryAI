---
name: memoryai-retrieval
version: 1.2.0
description: Executes hybrid search (SQLite FTS5 + Dense 384d Vectors), local reranking, and strict token budget context compression.
capabilities:
  - hybrid-fts-and-vector-search
  - local-reranking
  - temporal-validity-filtering
  - token-budget-bounding
dependencies:
  - memoryai-project
  - memoryai-security
activation_conditions:
  - recall-request
  - search-request
tools_used:
  - memory_recall
  - memory_search
  - memory_auto_context
security_requirements:
  - enforce-authorization-before-retrieval
  - enforce-strict-token-budget
---

# MemoryAI Retrieval: Hybrid Search & Bounded Compression

The `memoryai-retrieval` skill retrieves relevant memory while guaranteeing that the returned context remains strictly within the configured token budget.

## 🔍 Retrieval Pipeline

```text
Query
  ↓
1. Authorization & Scope Filter (Tenant, User, Project)
  ↓
2. FTS5 Keyword Search (BM25 lexical ranking)
  ↓
3. Dense Vector Similarity (384-dimensional cosine distance)
  ↓
4. Candidate Merge & Deduplication
  ↓
5. Local Multi-Factor Reranking (Vector 35%, BM25 25%, Importance 15%, Recency 10%, Temporal 10%, Access 5%)
  ↓
6. Temporal Validity Filter (valid_from <= now <= valid_to)
  ↓
7. Context Compression & Token Bounding (<= maxTokens budget)
```

## 📊 Token Budget Guarantee

- If total memories = 10,000 items (200,000+ tokens), MemoryAI compresses and returns only the top most relevant items fitting within `maxTokens` (default: 1000 tokens).
- Empty result returned if no memories meet the relevance threshold.
