import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/engine.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/sqlite-storage.js';

test('Memory Snapshots: Create, compare, and diff version history', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  // 1. Store initial memories
  const r1 = await engine.remember({
    content: 'Initial architecture: Fastify API with SQLite storage.',
    type: 'decision',
    importance: 0.9
  }, { tenant_id: 't1', user_id: 'u1', project_id: 'proj_snap' });

  // 2. Create Snapshot A
  const snapA = engine.snapshots.createSnapshot('v1.0.0', 'Initial milestone', {
    tenant_id: 't1',
    user_id: 'u1',
    project_id: 'proj_snap'
  });

  assert.ok(snapA.id);
  assert.equal(snapA.memory_count, 1);
  assert.ok(snapA.state_checksum);

  // 3. Store additional memory
  await engine.remember({
    content: 'Added Redis caching layer for read operations.',
    type: 'decision',
    importance: 0.8
  }, { tenant_id: 't1', user_id: 'u1', project_id: 'proj_snap' });

  // 4. Create Snapshot B
  const snapB = engine.snapshots.createSnapshot('v1.1.0', 'Added Redis', {
    tenant_id: 't1',
    user_id: 'u1',
    project_id: 'proj_snap'
  });

  assert.equal(snapB.memory_count, 2);

  // 5. Compare snapshots
  const comp = engine.snapshots.compareSnapshots(snapA.id, snapB.id);
  assert.equal(comp.sameState, false);
  assert.equal(comp.memoriesAdded, 1);
  assert.equal(comp.memoriesRemoved, 0);
  assert.equal(comp.memoriesRetained, 1);

  // 6. Test version diff
  const memId = r1.memory.id;
  storage.insertVersion({
    id: 'ver_1',
    memory_id: memId,
    version_number: 1,
    content: 'Initial architecture: Fastify API with SQLite storage.',
    summary: null,
    importance: 0.9,
    confidence: 1.0,
    entities: ['Fastify', 'SQLite'],
    topics: ['architecture'],
    changed_by: 'u1',
    change_reason: 'Initial creation',
    created_at: new Date().toISOString()
  });

  storage.insertVersion({
    id: 'ver_2',
    memory_id: memId,
    version_number: 2,
    content: 'Updated architecture: Fastify API with SQLite storage and vector index.',
    summary: null,
    importance: 0.95,
    confidence: 1.0,
    entities: ['Fastify', 'SQLite'],
    topics: ['architecture'],
    changed_by: 'u1',
    change_reason: 'Added vector index',
    created_at: new Date().toISOString()
  });

  const diff = engine.snapshots.computeMemoryDiff(memId, 1, 2);
  assert.equal(diff.content_changed, true);
  assert.equal(diff.changed_fields.includes('content'), true);
  assert.equal(diff.reason, 'Added vector index');

  storage.close();
});
