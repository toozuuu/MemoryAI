import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Reliability: Recall gracefully degrades when vector embeddings are missing', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  // Insert memory directly without saving a vector
  storage.insert({
    id: 'mem_no_vector',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_fault',
    type: 'decision',
    content: 'We use TypeScript compiler strictNullChecks option',
    summary: null,
    entities: ['TypeScript', 'strictNullChecks'],
    topics: ['compiler'],
    importance: 0.9,
    confidence: 1.0,
    durability: 0.9,
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
    content_hash: 'hash_no_vector'
  });

  // FTS5 search should still locate it even without vector
  const result = await engine.recall({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    query: 'strictNullChecks TypeScript',
    project_id: 'proj_fault'
  });

  assert.ok(result.context.includes('strictNullChecks'));
  assert.equal(result.memories.length, 1);

  storage.close();
});

test('Reliability: Search handles empty and special character query gracefully', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  const resEmpty = await engine.search('', { tenant_id: user.tenant_id, user_id: user.user_id });
  assert.ok(Array.isArray(resEmpty));

  const resSpecial = await engine.search('!!! @@@ $$$ %%% ^^^ *** ((( )))', {
    tenant_id: user.tenant_id,
    user_id: user.user_id
  });
  assert.ok(Array.isArray(resSpecial));

  storage.close();
});
