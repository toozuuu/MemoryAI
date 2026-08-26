import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { handleTemporalConflict } from '../../packages/memory-engine/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Temporal: handleTemporalConflict sets valid_to on old and valid_from on new memory', () => {
  const user = FIXTURE_USERS.alice;
  const context = { tenant_id: user.tenant_id, user_id: user.user_id, project_id: 'proj_test' };

  const oldMem = {
    id: 'old-1',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_test',
    type: 'decision',
    content: 'We use MySQL 5.7 for data storage',
    summary: null,
    entities: ['MySQL'],
    topics: ['database'],
    importance: 0.9,
    confidence: 1.0,
    durability: 0.8,
    freshness: 1.0,
    source_count: 1,
    verification_state: 'unverified',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    valid_from: '2024-01-01T00:00:00.000Z',
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
    content_hash: 'old_hash'
  };

  const newCandidate = {
    content: 'We migrated from MySQL to PostgreSQL 16',
    type: 'decision',
    importance: 0.95,
    entities: ['PostgreSQL']
  };

  const { supersededMemory, newMemory } = handleTemporalConflict(oldMem, newCandidate, context);

  assert.equal(supersededMemory.status, 'superseded');
  assert.ok(supersededMemory.valid_to);
  assert.equal(newMemory.status, 'active');
  assert.ok(newMemory.valid_from);
  assert.equal(newMemory.parent_memory_id, oldMem.id);
});

test('Temporal: Point-in-time recall retrieves historical facts when temporalDate is specified', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  // Insert historical 2024 memory
  storage.insert({
    id: 'mem_2024',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_temporal',
    type: 'decision',
    content: 'In 2024 we used Vue 2 for frontend',
    summary: null,
    entities: ['Vue 2'],
    topics: ['frontend'],
    importance: 0.9,
    confidence: 1.0,
    durability: 0.8,
    freshness: 0.5,
    source_count: 1,
    verification_state: 'unverified',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    valid_from: '2024-01-01T00:00:00.000Z',
    valid_to: '2025-01-01T00:00:00.000Z',
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_client: null,
    source_session_id: null,
    source_message_id: null,
    source_references: [],
    update_reason: null,
    parent_memory_id: null,
    status: 'superseded',
    privacy_level: 'internal',
    content_hash: 'vue2_hash'
  });

  // Insert current 2026 memory
  storage.insert({
    id: 'mem_2026',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_temporal',
    type: 'decision',
    content: 'In 2026 we use Angular 20 for frontend',
    summary: null,
    entities: ['Angular 20'],
    topics: ['frontend'],
    importance: 0.95,
    confidence: 1.0,
    durability: 0.9,
    freshness: 1.0,
    source_count: 1,
    verification_state: 'unverified',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_to: null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_client: null,
    source_session_id: null,
    source_message_id: null,
    source_references: [],
    update_reason: null,
    parent_memory_id: 'mem_2024',
    status: 'active',
    privacy_level: 'internal',
    content_hash: 'angular20_hash'
  });

  // Query without temporal date -> returns active 2026 Angular memory
  const currentRecall = await engine.recall({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    query: 'frontend framework',
    project_id: 'proj_temporal'
  });
  assert.ok(currentRecall.context.includes('Angular 20'));
  assert.ok(!currentRecall.context.includes('Vue 2'));

  // Query with historical temporal date 2024-06-01 -> returns Vue 2
  const historicalRecall = await engine.recall({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    query: 'frontend framework in 2024',
    project_id: 'proj_temporal',
    temporalDate: '2024-06-01T00:00:00.000Z',
    includeSuperseded: true
  });
  assert.ok(historicalRecall.context.includes('Vue 2'));

  storage.close();
});
