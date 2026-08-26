import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryPack, unpackMemoryPack } from '../../packages/storage-memory-format/dist/index.js';
import { createMemoryFromCandidate } from '../../packages/memory-engine/dist/index.js';

test('MemoryPack: exports and imports with SHA-256 integrity verification', async () => {
  const mem = createMemoryFromCandidate(
    { content: 'Persistent memory pack test data' },
    { tenant_id: 'default', user_id: 'u1' }
  );

  const packBuffer = await createMemoryPack([mem], {
    tenant_id: 'default',
    user_id: 'u1'
  });

  assert.ok(packBuffer.length > 0);

  const unpacked = await unpackMemoryPack(packBuffer);
  assert.equal(unpacked.manifest.memory_count, 1);
  assert.equal(unpacked.memories.length, 1);
  assert.equal(unpacked.memories[0].content, 'Persistent memory pack test data');
});
