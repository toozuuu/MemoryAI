import test from 'node:test';
import assert from 'node:assert/strict';
import { rerankMemories } from '../../packages/reranking/dist/index.js';

test('Ranking: Multi-factor reranking scores exact vector + BM25 match highest', () => {
  const candidates = [
    {
      memory: {
        id: 'mem_low_match',
        content: 'Unrelated notes about CSS styling colors',
        importance: 0.5,
        confidence: 0.8,
        status: 'active',
        created_at: '2024-01-01T00:00:00.000Z'
      },
      vectorScore: 0.2,
      bm25Score: 0.1
    },
    {
      memory: {
        id: 'mem_high_match',
        content: 'We use PostgreSQL 16 with pgvector for vector search',
        importance: 0.95,
        confidence: 1.0,
        status: 'active',
        created_at: new Date().toISOString()
      },
      vectorScore: 0.92,
      bm25Score: 0.88
    },
    {
      memory: {
        id: 'mem_superseded',
        content: 'Historical database was MySQL',
        importance: 0.9,
        confidence: 1.0,
        status: 'superseded',
        created_at: '2023-01-01T00:00:00.000Z'
      },
      vectorScore: 0.75,
      bm25Score: 0.6
    }
  ];

  const ranked = rerankMemories(candidates, {
    query: 'PostgreSQL pgvector vector database'
  });

  assert.equal(ranked[0].memory.id, 'mem_high_match');
  assert.ok(ranked[0].score > ranked[1].score);
  // Superseded memory receives penalty multiplier
  assert.ok(ranked[0].score > ranked.find((r) => r.memory.id === 'mem_superseded').score);
});
