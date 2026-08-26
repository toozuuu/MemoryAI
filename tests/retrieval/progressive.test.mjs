import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/engine.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/sqlite-storage.js';

test('Progressive Context: Level 1 Summary, Level 2 Canonical, Level 3 Evidence tiers', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  // Store decisions
  await engine.remember({
    content: 'We use SQLite with FTS5 and WAL mode for zero-dependency storage.',
    type: 'decision',
    importance: 0.95
  }, { tenant_id: 't1', user_id: 'u1', project_id: 'proj_prog' });

  await engine.remember({
    content: 'Authentication is enforced via AES-256-GCM tokens.',
    type: 'decision',
    importance: 0.90
  }, { tenant_id: 't1', user_id: 'u1', project_id: 'proj_prog' });

  // 1. Recall Level 1: summary
  const summaryRes = await engine.progressiveRecall({
    tenant_id: 't1',
    user_id: 'u1',
    query: 'What storage and auth do we use?',
    project_id: 'proj_prog',
    targetLevel: 'summary'
  });

  assert.equal(summaryRes.level, 'summary');
  assert.equal(summaryRes.context.includes('[MEMORY SUMMARY (LEVEL 1)]'), true);
  assert.equal(summaryRes.references.length >= 2, true);
  assert.ok(summaryRes.references[0].deep_fetch_handle);

  // 2. Recall Level 2: canonical
  const canonicalRes = await engine.progressiveRecall({
    tenant_id: 't1',
    user_id: 'u1',
    query: 'What storage do we use?',
    project_id: 'proj_prog',
    targetLevel: 'canonical'
  });

  assert.equal(canonicalRes.level, 'canonical');
  assert.equal(canonicalRes.context.includes('<MEMORY_DATA>'), true);
  assert.equal(canonicalRes.memories.length >= 1, true);

  // 3. Recall Level 3: evidence
  const evidenceRes = await engine.progressiveRecall({
    tenant_id: 't1',
    user_id: 'u1',
    query: 'What storage do we use?',
    project_id: 'proj_prog',
    targetLevel: 'evidence'
  });

  assert.equal(evidenceRes.level, 'evidence');
  assert.equal(evidenceRes.context.includes('MEMORY DATA'), true);

  storage.close();
});
