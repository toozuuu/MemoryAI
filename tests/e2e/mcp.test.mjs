import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer, MCP_TOOLS } from '../../adapters/mcp/dist/index.js';

test('E2E MCP: tools are defined and callable', async () => {
  const server = new McpServer();
  assert.ok(MCP_TOOLS.length >= 10);

  // Test memory_remember tool
  const rememberRes = await server.handleToolCall('memory_remember', {
    content: 'Team decided to use Docker multi-stage builds for container security',
    type: 'decision',
    importance: 0.9,
    userId: 'mcp-user'
  });
  assert.ok(rememberRes.content[0].text.includes('saved'));

  // Test memory_recall tool
  const recallRes = await server.handleToolCall('memory_recall', {
    query: 'Docker container configuration',
    userId: 'mcp-user',
    maxTokens: 500
  });
  assert.ok(recallRes.content[0].text.includes('Docker multi-stage builds'));
  assert.ok(recallRes.tokenCount <= 500);

  // Test memory_status tool
  const statusRes = await server.handleToolCall('memory_status', {});
  assert.ok(statusRes.content[0].text.includes('healthy'));
});
