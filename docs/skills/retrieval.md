# `memoryai-retrieval` Skill

Executes hybrid search (SQLite FTS5 + Dense 384d Vectors), local reranking, and strict token budget context compression.

## Retrieval Pipeline
1. **Authorization & Scope Filter:** Enforces tenant, user, and project security boundary.
2. **FTS5 Lexical Search:** BM25 keyword matching.
3. **Dense Vector Search:** 384-dimensional cosine similarity.
4. **Candidate Merge & Local Reranking:** Multi-factor scoring (Vector, BM25, Importance, Recency, Temporal, Access).
5. **Context Compression:** Guarantees context $\le \text{maxTokens}$.

## Tools Used
- `memory_recall`
- `memory_search`
- `memory_auto_context`
