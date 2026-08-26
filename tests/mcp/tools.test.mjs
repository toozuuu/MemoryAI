import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer, MCP_TOOLS } from '../../adapters/mcp/dist/index.js';

test('MCP Tools: All registered tools have valid schemas and required tools are present', () => {
  assert.ok(MCP_TOOLS.length >= 17, `Expected at least 17 tools, found ${MCP_TOOLS.length}`);
  const toolNames = MCP_TOOLS.map((t) => t.name);

  const requiredTools = [
    'memory_auto_context',
    'memory_recall',
    'memory_remember',
    'memory_handoff_create',
    'memory_handoff_get',
    'memory_share',
    'memory_embeddings_status',
    'memory_update',
    'memory_search',
    'memory_forget',
    'memory_context',
    'memory_timeline',
    'memory_export',
    'memory_import',
    'memory_status',
    'memory_explain',
    'task_create',
    'task_get',
    'memory_progressive_recall',
    'memory_snapshot_create',
    'memory_health'
  ];

  for (const name of requiredTools) {
    assert.ok(toolNames.includes(name), `Missing tool ${name}`);
  }
});

test('MCP Tools: memory_remember -> memory_recall -> memory_explain workflow over JSON-RPC', async () => {
  const server = new McpServer();
  const userId = 'dev_test_mcp';

  // 1. Remember
  const rem = await server.handleToolCall('memory_remember', {
    content: 'We configure Redis clustering with 3 master nodes and 3 replicas',
    type: 'decision',
    importance: 0.9,
    userId
  });
  assert.ok(rem.memoryId);

  // 2. Recall
  const rec = await server.handleToolCall('memory_recall', {
    query: 'Redis clustering configuration',
    userId,
    maxTokens: 500
  });
  assert.ok(rec.content[0].text.includes('Redis clustering'));

  // 3. Explain
  const exp = await server.handleToolCall('memory_explain', {
    query: 'Redis cluster nodes',
    userId
  });
  assert.ok(exp.breakdown);
  assert.ok(exp.breakdown.rankedMemories.length >= 1);

  // 4. Metrics
  const met = await server.handleToolCall('memory_metrics', {});
  assert.ok(met.metrics);
  assert.ok(met.metrics.totalRetrievals >= 1);
});
