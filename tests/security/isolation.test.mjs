import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';
import { assertTenantAccess, assertUserAccess } from '../../packages/security/dist/index.js';
import { FIXTURE_USERS } from '../fixtures/users.mjs';
import { FIXTURE_PROJECTS } from '../fixtures/projects.mjs';

test('Security Isolation: Cross-tenant recall returns zero memories', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  const tenantAlpha = FIXTURE_USERS.alice;
  const tenantBeta = FIXTURE_USERS.charlieCrossTenant;

  // Tenant Alpha stores secret
  await engine.remember(
    { content: 'Tenant Alpha proprietary algorithm configuration', importance: 0.95 },
    { tenant_id: tenantAlpha.tenant_id, user_id: tenantAlpha.user_id }
  );

  // Tenant Beta searches
  const betaRecall = await engine.recall({
    tenant_id: tenantBeta.tenant_id,
    user_id: tenantBeta.user_id,
    query: 'proprietary algorithm'
  });

  assert.equal(betaRecall.memories.length, 0);
  assert.ok(!betaRecall.context.includes('Tenant Alpha'));

  storage.close();
});

test('Security Isolation: Namespace isolation prevents cross-namespace recall', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });
  const user = FIXTURE_USERS.alice;

  // Seed memory with explicit namespace 'workstream_billing'
  storage.insert({
    id: 'mem_ns_billing',
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    scope: 'project',
    project_id: 'proj_test',
    namespace: 'workstream_billing',
    type: 'decision',
    content: 'Billing microservice API key is stored in AWS KMS',
    summary: null,
    entities: ['AWS KMS', 'Billing'],
    topics: ['billing'],
    importance: 0.9,
    confidence: 1.0,
    durability: 0.9,
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
    content_hash: 'hash_ns_billing'
  });

  // Querying with namespace 'workstream_auth' returns zero results
  const authResults = storage.list({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    namespace: 'workstream_auth'
  });
  assert.equal(authResults.length, 0);

  // Querying with namespace 'workstream_billing' finds the memory
  const billingResults = storage.list({
    tenant_id: user.tenant_id,
    user_id: user.user_id,
    namespace: 'workstream_billing'
  });
  assert.equal(billingResults.length, 1);
  assert.equal(billingResults[0].id, 'mem_ns_billing');

  storage.close();
});

test('Security Isolation: RBAC guard throws on cross-tenant or unauthorized IDOR', () => {
  const alice = FIXTURE_USERS.alice;
  const charlie = FIXTURE_USERS.charlieCrossTenant;

  assert.throws(
    () => assertTenantAccess(alice.tenant_id, charlie.tenant_id),
    (err) => err.message.includes('cross-tenant') || err.message.includes('Tenant')
  );

  assert.throws(
    () => assertUserAccess(alice.user_id, charlie.user_id, 'developer'),
    (err) => err.message.includes('cross-user') || err.message.includes('User')
  );
});
