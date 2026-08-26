import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('Concurrency: Simultaneous asynchronous writes succeed without deadlocks under WAL mode', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  const totalConcurrent = 20;
  const promises = [];

  for (let i = 1; i <= totalConcurrent; i++) {
    promises.push(
      engine.remember(
        {
          content: `Concurrent worker thread specification ${i}: Automated queue task ${i}`,
          type: 'task',
          importance: 0.8
        },
        { tenant_id: user.tenant_id, user_id: user.user_id, project_id: 'proj_concurrent' }
      )
    );
  }

  const results = await Promise.all(promises);
  assert.equal(results.length, totalConcurrent);
  assert.equal(storage.count(), totalConcurrent);

  // Simultaneous parallel searches
  const searchPromises = [];
  for (let i = 1; i <= 10; i++) {
    searchPromises.push(
      engine.search(`worker thread ${i}`, { tenant_id: user.tenant_id, user_id: user.user_id })
    );
  }
  const searchResults = await Promise.all(searchPromises);
  assert.equal(searchResults.length, 10);

  storage.close();
});
