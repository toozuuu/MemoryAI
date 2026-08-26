import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { BENCHMARK_SEEDS, BENCHMARK_QUERIES } from '../fixtures/benchmark-dataset.mjs';
import { runRetrievalBenchmark } from '../helpers/retrieval-benchmark.mjs';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Retrieval Benchmark: Evaluates precision, recall, MRR, and false retrieval rate', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  // Seed benchmark memories
  for (const seed of BENCHMARK_SEEDS) {
    const mem = {
      id: seed.id,
      tenant_id: user.tenant_id,
      user_id: user.user_id,
      scope: seed.scope,
      project_id: seed.project_id,
      type: seed.type,
      content: seed.content,
      summary: null,
      entities: seed.entities || [],
      topics: seed.topics || [],
      importance: seed.importance || 0.8,
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
      content_hash: `hash_${seed.id}`
    };
    storage.insert(mem);
    const embedText = `${seed.content} ${(seed.entities || []).join(' ')} ${(seed.topics || []).join(' ')}`.trim();
    const vec = await engine.embeddingProvider.embed(embedText);
    storage.saveVector(mem.id, vec);
  }

  const results = await runRetrievalBenchmark(engine, BENCHMARK_QUERIES, {
    tenant_id: user.tenant_id,
    user_id: user.user_id
  });

  // Assert target quality thresholds
  assert.ok(results.mrr >= 0.80, `MRR ${results.mrr} below threshold 0.80`);
  assert.ok(results.precisionAtK >= 0.75, `Precision@K ${results.precisionAtK} below threshold 0.75`);
  assert.ok(results.falsePositiveRate <= 0.20, `False positive rate ${results.falsePositiveRate} above threshold 0.20`);

  storage.close();
});
