import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('Schema Migration: Automatically adds missing columns to older legacy databases', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-mig-'));
  const dbPath = path.join(tempDir, 'legacy.db');

  // 1. Create a raw legacy database lacking `namespace`, `durability`, `organization_id`
  const rawDb = new DatabaseSync(dbPath);
  rawDb.exec(`
    CREATE TABLE memories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      project_id TEXT,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      entities TEXT NOT NULL,
      topics TEXT NOT NULL,
      importance REAL NOT NULL,
      confidence REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      privacy_level TEXT NOT NULL,
      content_hash TEXT NOT NULL
    );
  `);
  rawDb.close();

  // 2. Open via SqliteMemoryStorage — migration guards must execute cleanly
  const storage = new SqliteMemoryStorage({ dbPath });
  assert.ok(storage);

  // 3. Verify insert with new columns works
  storage.insert({
    id: 'upgraded_mem_1',
    tenant_id: 'default',
    organization_id: 'org_upgraded',
    user_id: 'user_upgraded',
    scope: 'project',
    project_id: 'proj_upgraded',
    namespace: 'ns_upgraded',
    type: 'decision',
    content: 'Memory in upgraded schema',
    summary: null,
    entities: [],
    topics: [],
    importance: 0.9,
    confidence: 1.0,
    durability: 0.95,
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
    content_hash: 'hash_upgraded_1'
  });

  const fetched = storage.getById('upgraded_mem_1');
  assert.ok(fetched);
  assert.equal(fetched.namespace, 'ns_upgraded');
  assert.equal(fetched.organization_id, 'org_upgraded');
  assert.equal(fetched.durability, 0.95);

  storage.close();
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
});
