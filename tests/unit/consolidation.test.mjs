import test from 'node:test';
import assert from 'node:assert/strict';
import { runMemoryConsolidation } from '../../packages/consolidation/dist/index.js';
import { createMemoryFromCandidate } from '../../packages/memory-engine/dist/index.js';

test('Consolidation: clusters related memories into canonical summaries', () => {
  const m1 = createMemoryFromCandidate(
    { content: 'SQLite supports full-text search with FTS5', entities: ['SQLite'] },
    { tenant_id: 'default', user_id: 'u1' }
  );
  const m2 = createMemoryFromCandidate(
    { content: 'SQLite supports WAL mode for concurrent reads', entities: ['SQLite'] },
    { tenant_id: 'default', user_id: 'u1' }
  );

  const res = runMemoryConsolidation([m1, m2], { tenant_id: 'default', user_id: 'u1' });
  assert.equal(res.canonicalMemoriesCreated.length, 1);
  assert.equal(res.archivedMemoryIds.length, 2);
  assert.ok(res.canonicalMemoriesCreated[0].content.includes('FTS5'));
  assert.ok(res.canonicalMemoriesCreated[0].content.includes('WAL'));
});
