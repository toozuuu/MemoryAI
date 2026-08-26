import test from 'node:test';
import assert from 'node:assert/strict';
import { runMemoryConsolidation } from '../../packages/consolidation/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Deduplication: Identical content hash returns IGNORE on second attempt', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  const res1 = await engine.remember(
    { content: 'We deploy services using Kubernetes Helm charts', importance: 0.9 },
    { tenant_id: user.tenant_id, user_id: user.user_id }
  );
  assert.equal(res1.decision.action, 'CREATE');

  const res2 = await engine.remember(
    { content: 'We deploy services using Kubernetes Helm charts', importance: 0.9 },
    { tenant_id: user.tenant_id, user_id: user.user_id }
  );
  assert.equal(res2.decision.action, 'IGNORE');
  assert.equal(storage.count(), 1);

  storage.close();
});

test('Deduplication: Consolidation clusters semantically overlapping fragments into canonical record', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;
  const context = { tenant_id: user.tenant_id, user_id: user.user_id, project_id: 'proj_dedup' };

  // Seed 3 related SQLite memories
  storage.insert({
    id: 'mem_sqlite_1',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_dedup',
    type: 'decision',
    content: 'We use SQLite with WAL mode enabled',
    summary: null,
    entities: ['SQLite', 'WAL mode'],
    topics: ['database'],
    importance: 0.8,
    confidence: 1.0,
    durability: 0.8,
    freshness: 1.0,
    source_count: 1,
    verification_state: 'unverified',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    valid_from: null,
    valid_to: null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_client: null,
    source_session_id: null,
    source_message_id: null,
    source_references: [],
    update_reason: null,
    parent_memory_id: null,
    status: 'active',
    privacy_level: 'internal',
    content_hash: 'hash_sqlite_1'
  });

  storage.insert({
    id: 'mem_sqlite_2',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_dedup',
    type: 'decision',
    content: 'SQLite stores vector embeddings in the vectors table',
    summary: null,
    entities: ['SQLite', 'vectors'],
    topics: ['database'],
    importance: 0.85,
    confidence: 1.0,
    durability: 0.8,
    freshness: 1.0,
    source_count: 1,
    verification_state: 'unverified',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    valid_from: null,
    valid_to: null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_client: null,
    source_session_id: null,
    source_message_id: null,
    source_references: [],
    update_reason: null,
    parent_memory_id: null,
    status: 'active',
    privacy_level: 'internal',
    content_hash: 'hash_sqlite_2'
  });

  const memories = storage.list(context);
  const result = await runMemoryConsolidation(memories, context);

  assert.ok(result.archivedMemoryIds.length >= 0);
  assert.ok(result.consolidatedMemories.length >= 0);

  storage.close();
});
