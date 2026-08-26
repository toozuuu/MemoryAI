import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeMemoryAccess, assertTenantAccess, assertUserAccess, AuthorizationError } from '../../packages/security/dist/index.js';
import { createMemoryFromCandidate } from '../../packages/memory-engine/dist/index.js';

test('Security IDOR: user cannot access memory of another user', () => {
  const victimMemory = createMemoryFromCandidate(
    { content: 'Victim private financial and personal details' },
    { tenant_id: 'tenant-a', user_id: 'victim-user' }
  );

  const attackerUser = {
    id: 'attacker-user',
    tenant_id: 'tenant-a',
    role: 'member',
    created_at: new Date().toISOString()
  };

  assert.throws(
    () => authorizeMemoryAccess(attackerUser, victimMemory, 'read'),
    AuthorizationError
  );

  assert.throws(
    () => assertUserAccess(attackerUser, 'victim-user'),
    AuthorizationError
  );
});

test('Security IDOR: cross-tenant access is strictly blocked', () => {
  const tenantAMemory = createMemoryFromCandidate(
    { content: 'Tenant A enterprise memory' },
    { tenant_id: 'tenant-a', user_id: 'user-1' }
  );

  const tenantBUser = {
    id: 'user-1',
    tenant_id: 'tenant-b',
    role: 'member',
    created_at: new Date().toISOString()
  };

  assert.throws(
    () => authorizeMemoryAccess(tenantBUser, tenantAMemory, 'read'),
    AuthorizationError
  );

  assert.throws(
    () => assertTenantAccess(tenantBUser, 'tenant-a'),
    AuthorizationError
  );
});
