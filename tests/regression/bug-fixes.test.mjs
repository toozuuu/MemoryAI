import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { McpServer } from '../../adapters/mcp/dist/index.js';
import { createMemoryPack } from '../../packages/storage-memory-format/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Regression Fix 1: remember() deduplicates against newly stored active memories', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  const first = await engine.remember(
    { content: 'We use TypeScript for all microservices', importance: 0.9 },
    { tenant_id: user.tenant_id, user_id: user.user_id }
  );
  assert.equal(first.decision.action, 'CREATE');

  // Immediate second attempt with exact same content must be IGNORED
  const second = await engine.remember(
    { content: 'We use TypeScript for all microservices', importance: 0.9 },
    { tenant_id: user.tenant_id, user_id: user.user_id }
  );
  assert.equal(second.decision.action, 'IGNORE');

  storage.close();
});

test('Regression Fix 2: memory_import is idempotent on repeated pack imports', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const server = new McpServer(engine);
  const user = FIXTURE_USERS.alice;

  const packBuffer = await createMemoryPack(
    [
      {
        id: '11111111-2222-4333-8444-555555555555',
        tenant_id: user.tenant_id,
        user_id: user.user_id,
        scope: 'project',
        project_id: 'proj_reg',
        type: 'decision',
        content: 'Idempotency test memory content',
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
        content_hash: 'hash_reg_idempotency'
      }
    ],
    { tenant_id: user.tenant_id, user_id: user.user_id }
  );

  const packBase64 = packBuffer.toString('base64');

  // 1st Import: imports 1
  const res1 = await server.handleToolCall('memory_import', { packBase64, userId: user.user_id });
  assert.equal(res1.importedCount, 1);

  // 2nd Import: skips duplicate
  const res2 = await server.handleToolCall('memory_import', { packBase64, userId: user.user_id });
  assert.equal(res2.importedCount, 0);
  assert.equal(res2.skippedCount, 1);
  assert.equal(storage.count(), 1);

  storage.close();
});
