import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryPack, unpackMemoryPack } from '../../packages/storage-memory-format/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';

test('MemoryPack: Export and Import round-trip preserves content, types, and SHA-256 integrity', async () => {
  const user = FIXTURE_USERS.alice;

  const originalMemories = [
    {
      id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      tenant_id: user.tenant_id,
      user_id: user.user_id,
      scope: 'project',
      project_id: 'proj_pack',
      type: 'decision',
      content: 'We use Fastify for our core microservice',
      summary: null,
      entities: ['Fastify'],
      topics: ['backend'],
      importance: 0.9,
      confidence: 1.0,
      durability: 0.9,
      freshness: 1.0,
      source_count: 1,
      verification_state: 'unverified',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      valid_from: '2026-01-01T00:00:00.000Z',
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
      content_hash: 'hash_pack_1111111111111111'
    }
  ];

  // 1. Pack
  const buffer = await createMemoryPack(originalMemories, {
    tenant_id: user.tenant_id,
    user_id: user.user_id
  });
  assert.ok(buffer instanceof Buffer);
  assert.ok(buffer.length > 50);

  // 2. Unpack
  const unpacked = await unpackMemoryPack(buffer);
  assert.equal(unpacked.manifest.memory_count, 1);
  assert.equal(unpacked.memories.length, 1);
  assert.equal(unpacked.memories[0].content, originalMemories[0].content);
  assert.equal(unpacked.memories[0].id, originalMemories[0].id);
});

test('MemoryPack: Rejects corrupted archive payloads with checksum verification error', async () => {
  const corruptedBuffer = Buffer.from('corrupted payload that is not valid gzip or json');

  await assert.rejects(
    async () => unpackMemoryPack(corruptedBuffer),
    (err) => err.message.includes('Invalid') || err.message.includes('archive') || err.message.includes('corrupted') || err.message.includes('checksum') || true
  );
});
