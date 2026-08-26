import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Retrieval Explain: engine.explain() returns ranking breakdown, vector and BM25 scores', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;
  const context = { tenant_id: user.tenant_id, user_id: user.user_id, project_id: 'proj_explain' };

  await engine.remember({ content: 'We use PostgreSQL with pgvector for embeddings', importance: 0.95 }, context);
  await engine.remember({ content: 'Frontend uses Angular with Signals', importance: 0.90 }, context);

  const explanation = await engine.explain({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    query: 'PostgreSQL database vectors',
    project_id: 'proj_explain',
    maxTokens: 500
  });

  assert.equal(explanation.query, 'PostgreSQL database vectors');
  assert.ok(explanation.totalCandidates >= 2);
  assert.ok(explanation.rankedMemories.length >= 2);

  // Highest ranked candidate should be postgres
  const top = explanation.rankedMemories[0];
  assert.ok(top.content.includes('PostgreSQL'));
  assert.ok(top.score > 0);
  assert.equal(top.includedInContext, true);

  storage.close();
});
