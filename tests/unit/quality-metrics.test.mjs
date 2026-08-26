import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics } from '../../packages/observability/dist/index.js';
import { createMemoryFromCandidate } from '../../packages/memory-engine/dist/index.js';

test('Quality & Metrics: captures durability, provenance, and token metrics', () => {
  metrics.reset();

  const mem = createMemoryFromCandidate(
    {
      content: 'Production database standard is PostgreSQL with pgvector',
      importance: 0.95,
      durability: 0.9,
      source_provider: 'anthropic',
      source_client: 'claude-code',
      source_session_id: 'sess-abc-123'
    },
    { tenant_id: 'default', user_id: 'u1' }
  );

  assert.equal(mem.importance, 0.95);
  assert.equal(mem.durability, 0.9);
  assert.equal(mem.source_provider, 'anthropic');
  assert.equal(mem.verification_state, 'unverified');

  // Record retrieval metrics
  metrics.recordMemoryCount(100);
  metrics.recordRetrieval(25, 50000, 1000);

  const snap = metrics.getSnapshot();
  assert.equal(snap.totalMemories, 100);
  assert.equal(snap.totalRetrievals, 1);
  assert.equal(snap.totalTokensSaved, 49000);
  assert.equal(snap.tokenReductionPercentage, 98);
});
