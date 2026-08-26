import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine, EmbeddingMigrator } from '../../packages/core/dist/index.js';
import { LocalEmbeddingProvider } from '../../packages/embeddings/dist/index.js';

test('Embedding Migration: detects status, builds shadow vectors, and swaps index', async () => {
  const engine = new MemoryEngine();
  const userId = 'dev-sachin';

  // Seed memories
  await engine.remember({ content: 'Memory 1 about TypeScript' }, { tenant_id: 'default', user_id: userId });
  await engine.remember({ content: 'Memory 2 about Fastify API' }, { tenant_id: 'default', user_id: userId });
  await engine.remember({ content: 'Memory 3 about SQLite FTS5' }, { tenant_id: 'default', user_id: userId });

  const migrator = new EmbeddingMigrator(engine.storage);
  const statusBefore = migrator.getStatus(engine.embeddingProvider);
  assert.equal(statusBefore.totalMemories, 3);
  assert.equal(statusBefore.vectorCount, 3);

  // Perform migration with new provider
  const newProvider = new LocalEmbeddingProvider();
  const report = await migrator.migrate(newProvider, { batchSize: 2 });

  assert.equal(report.success, true);
  assert.equal(report.migratedCount, 3);
  assert.equal(report.swapped, true);

  // Check status after migration
  const statusAfter = migrator.getStatus(newProvider);
  assert.equal(statusAfter.vectorCount, 3);
  assert.equal(statusAfter.isCompatible, true);

  // Test rollback
  migrator.rollback();
  const statusRollback = migrator.getStatus(engine.embeddingProvider);
  assert.equal(statusRollback.vectorCount, 3);
});
