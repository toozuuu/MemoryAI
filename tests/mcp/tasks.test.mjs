import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../../adapters/mcp/dist/mcp-server.js';
import { MemoryEngine } from '../../packages/core/dist/engine.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/sqlite-storage.js';

test('MCP Tasks Extension: task_create, task_get, task_cancel, task_list lifecycle', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const server = new McpServer(engine);

  // 1. Create a long-running background task
  const createRes = await server.handleToolCall('task_create', {
    type: 'embedding_rebuild',
    name: 'Rebuild 384d semantic vectors',
    projectId: 'proj_test'
  });

  assert.ok(createRes.taskId);
  assert.equal(createRes.task.status, 'queued');

  // 2. Poll task status by explicit handle
  const getRes = await server.handleToolCall('task_get', {
    taskId: createRes.taskId
  });

  assert.equal(getRes.taskId, createRes.taskId);
  assert.equal(getRes.status, 'queued');
  assert.equal(getRes.progress, 0);

  // 3. Update task progress internally
  engine.tasks.updateProgress(createRes.taskId, 50, 'running');
  const runningRes = await server.handleToolCall('task_get', {
    taskId: createRes.taskId
  });
  assert.equal(runningRes.status, 'running');
  assert.equal(runningRes.progress, 50);

  // 4. List tasks
  const listRes = await server.handleToolCall('task_list', {});
  assert.equal(listRes.tasks.length, 1);
  assert.equal(listRes.tasks[0].id, createRes.taskId);

  // 5. Cancel task
  const cancelRes = await server.handleToolCall('task_cancel', {
    taskId: createRes.taskId
  });
  assert.equal(cancelRes.cancelled, true);

  const finalRes = await server.handleToolCall('task_get', {
    taskId: createRes.taskId
  });
  assert.equal(finalRes.status, 'cancelled');

  storage.close();
});
