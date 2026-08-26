import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function createTestStorage(options = {}) {
  if (options.inMemory !== false && !options.dbPath) {
    return new SqliteMemoryStorage({ dbPath: ':memory:' });
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memoryai-test-'));
  const dbPath = path.join(tempDir, 'test.db');
  const storage = new SqliteMemoryStorage({ dbPath });
  return {
    storage,
    cleanup: () => {
      try { storage.close(); } catch {}
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  };
}

export function createTestEngine(options = {}) {
  const storage = options.storage || new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  return {
    engine,
    storage,
    cleanup: () => {
      try { storage.close(); } catch {}
    }
  };
}
