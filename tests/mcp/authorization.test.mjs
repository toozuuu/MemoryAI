import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../../adapters/mcp/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';

test('MCP Authorization: Cross-user mutation in memory_update is rejected', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const server = new McpServer(engine);

  // User Alice stores a memory
  const aliceRes = await server.handleToolCall('memory_remember', {
    content: 'Alice private key configuration notes',
    type: 'decision',
    importance: 0.9,
    userId: 'user-alice'
  });
  const aliceMemId = aliceRes.memoryId;

  // User Bob attempts to maliciously update Alice's memory
  await assert.rejects(
    async () => {
      await server.handleToolCall('memory_update', {
        id: aliceMemId,
        content: 'Malicious content overwrite by Bob',
        userId: 'user-bob'
      });
    },
    (err) => {
      assert.ok(err.message.includes('Unauthorized update'));
      return true;
    }
  );

  // Verify Alice memory remained untouched
  const mem = storage.getById(aliceMemId);
  assert.equal(mem.content, 'Alice private key configuration notes');

  storage.close();
});
