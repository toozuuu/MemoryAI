import test from 'node:test';
import assert from 'node:assert/strict';
import { McpServer } from '../../adapters/mcp/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('MCP Statelessness: Independent MCP server instances share state cleanly without transport sessions', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-stateless-'));
  const dbPath = path.join(tempDir, 'shared.db');

  // Server Instance 1: Client writes memory
  const storage1 = new SqliteMemoryStorage({ dbPath });
  const engine1 = new MemoryEngine({ storage: storage1 });
  const server1 = new McpServer(engine1);

  const writeRes = await server1.handleToolCall('memory_remember', {
    content: 'Architectural note: Stateless MCP server requests are routed via explicit headers',
    type: 'decision',
    importance: 0.9,
    userId: 'user-stateless-test'
  });
  assert.ok(writeRes.memoryId);
  storage1.close();

  // Server Instance 2: New process / connection recalls the memory
  const storage2 = new SqliteMemoryStorage({ dbPath });
  const engine2 = new MemoryEngine({ storage: storage2 });
  const server2 = new McpServer(engine2);

  const readRes = await server2.handleToolCall('memory_recall', {
    query: 'stateless MCP server requests',
    userId: 'user-stateless-test',
    maxTokens: 500
  });

  assert.ok(readRes.content[0].text.includes('Stateless MCP server requests'));
  storage2.close();

  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
});
