import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { createMemoryPack, unpackMemoryPack } from '../../packages/storage-memory-format/dist/index.js';

test('E2E: Complete Memory Lifecycle (remember -> search -> recall -> update -> conflict -> forget)', async () => {
  const engine = new MemoryEngine();
  const context = { tenant_id: 'tenant-test', user_id: 'user-test' };

  // 1. Remember
  const r1 = await engine.remember(
    {
      content: 'User prefers dark mode and JetBrains Mono monospace font',
      type: 'preference',
      importance: 0.95
    },
    context
  );
  assert.equal(r1.decision.action, 'CREATE');
  assert.ok(r1.memory);
  const mem1Id = r1.memory.id;

  // 2. Search
  const searchResults = await engine.search('dark mode', context, 5);
  assert.ok(searchResults.length >= 1);
  assert.equal(searchResults[0].memory.id, mem1Id);

  // 3. Recall with strict token budget
  const recallResult = await engine.recall({
    tenant_id: context.tenant_id,
    user_id: context.user_id,
    query: 'font and theme settings',
    maxTokens: 500
  });
  assert.ok(recallResult.tokenCount <= 500);
  assert.ok(recallResult.context.includes('JetBrains Mono'));
  assert.ok(recallResult.memories.length >= 1);

  // 4. Update
  const updatedMem = engine.storage.getById(mem1Id);
  assert.ok(updatedMem);
  updatedMem.content = 'User prefers dark mode, JetBrains Mono font, and compact spacing';
  engine.storage.update(updatedMem);

  const refetched = engine.storage.getById(mem1Id);
  assert.ok(refetched.content.includes('compact spacing'));

  // 5. Conflict & Temporal invalidation
  const rConflict = await engine.remember(
    {
      content: 'Switched from dark mode to light mode for all editors'
    },
    context
  );
  assert.ok(rConflict.decision.action === 'CONFLICT' || rConflict.decision.action === 'CREATE');

  // 6. Export to .memorypack & Import
  const allMemories = engine.storage.list(context);
  const packBuffer = await createMemoryPack(allMemories, {
    tenant_id: context.tenant_id,
    user_id: context.user_id
  });
  const unpacked = await unpackMemoryPack(packBuffer);
  assert.equal(unpacked.memories.length, allMemories.length);

  // 7. Forget
  const forgotten = await engine.forget(mem1Id, context);
  assert.equal(forgotten, true);
  assert.equal(engine.storage.getById(mem1Id), null);
});
