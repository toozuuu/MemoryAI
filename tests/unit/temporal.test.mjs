import test from 'node:test';
import assert from 'node:assert/strict';
import { handleTemporalConflict, createMemoryFromCandidate } from '../../packages/memory-engine/dist/index.js';

test('Temporal Memory: handleTemporalConflict sets valid_to on old and valid_from on new', () => {
  const initialMem = createMemoryFromCandidate(
    {
      content: 'User uses React for projects',
      valid_from: '2024-01-01T00:00:00.000Z'
    },
    { tenant_id: 'default', user_id: 'u1' }
  );

  const { supersededMemory, newMemory } = handleTemporalConflict(
    initialMem,
    { content: 'User uses Angular for projects' },
    { tenant_id: 'default', user_id: 'u1' }
  );

  // Assert historical record is preserved with valid_to
  assert.equal(supersededMemory.id, initialMem.id);
  assert.equal(supersededMemory.status, 'superseded');
  assert.ok(supersededMemory.valid_to !== null);

  // Assert new active record has valid_from and parent link
  assert.equal(newMemory.status, 'active');
  assert.equal(newMemory.parent_memory_id, initialMem.id);
  assert.ok(newMemory.valid_from !== null);
  assert.equal(newMemory.valid_to, null);
});
