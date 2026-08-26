import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalEmbeddingProvider, cosineSimilarity } from '../../packages/embeddings/dist/index.js';
import { EmbeddingMigrator } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Embeddings: LocalEmbeddingProvider produces normalized 384d vectors', async () => {
  const provider = new LocalEmbeddingProvider();
  const vec1 = await provider.embed('PostgreSQL relational database storage engine');
  const vec2 = await provider.embed('PostgreSQL relational database storage tables');
  const vec3 = await provider.embed('Strawberry fruit sweet dessert cooking recipe');

  assert.equal(vec1.length, 384);
  assert.equal(vec2.length, 384);

  const simRel = cosineSimilarity(vec1, vec2);
  const simUnrel = cosineSimilarity(vec1, vec3);

  assert.ok(simRel > simUnrel, `Expected ${simRel} > ${simUnrel}`);
});

test('Embedding Migration: Builds shadow vectors, swaps atomically, and supports rollback', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const user = FIXTURE_USERS.alice;
  const migrator = new EmbeddingMigrator(storage);
  const provider = new LocalEmbeddingProvider();

  // Seed test memories
  for (let i = 1; i <= 3; i++) {
    storage.insert({
      id: `mig_mem_${i}`,
      tenant_id: user.tenant_id,
      user_id: user.user_id,
      scope: 'project',
      project_id: 'proj_mig',
      type: 'decision',
      content: `Migration test item ${i}`,
      summary: null,
      entities: [],
      topics: [],
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
      content_hash: `hash_mig_${i}1111111111`
    });
  }

  // Execute migration
  const migrationRes = await migrator.migrate(provider);
  assert.equal(migrationRes.success, true);
  assert.equal(migrationRes.migratedCount, 3);
  assert.equal(migrationRes.swapped, true);

  // Verify vectors exist
  const vectors = storage.getVectors(['mig_mem_1', 'mig_mem_2', 'mig_mem_3']);
  assert.equal(vectors.size, 3);

  // Test rollback
  migrator.rollback();
  const statusAfterRollback = migrator.getStatus(provider);
  assert.ok(statusAfterRollback);

  storage.close();
});
