import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';

test('Project Isolation: Project A memory never leaks to Project B queries', async () => {
  const engine = new MemoryEngine();
  const userId = 'dev-sachin';

  // Seed Project A memory
  await engine.remember(
    {
      content: 'Project A uses PostgreSQL 16 with pgvector extension',
      type: 'decision',
      scope: 'project',
      importance: 0.95
    },
    {
      tenant_id: 'default',
      user_id: userId,
      project_id: 'proj_alpha'
    }
  );

  // Seed Project B memory
  await engine.remember(
    {
      content: 'Project B uses MySQL 8.0 with InnoDB cluster',
      type: 'decision',
      scope: 'project',
      importance: 0.95
    },
    {
      tenant_id: 'default',
      user_id: userId,
      project_id: 'proj_beta'
    }
  );

  // Query inside Project B context
  const recallBeta = await engine.recall({
    tenant_id: 'default',
    user_id: userId,
    project_id: 'proj_beta',
    query: 'What database do we use?'
  });

  // Verify Project B context contains MySQL but NOT PostgreSQL
  assert.ok(recallBeta.context.includes('MySQL 8.0'));
  assert.ok(!recallBeta.context.includes('PostgreSQL 16'));
  assert.ok(!recallBeta.context.includes('pgvector'));

  // Query inside Project A context
  const recallAlpha = await engine.recall({
    tenant_id: 'default',
    user_id: userId,
    project_id: 'proj_alpha',
    query: 'What database do we use?'
  });

  // Verify Project A context contains PostgreSQL but NOT MySQL
  assert.ok(recallAlpha.context.includes('PostgreSQL 16'));
  assert.ok(!recallAlpha.context.includes('MySQL 8.0'));
});

test('User Isolation: User A memory never leaks to User B queries', async () => {
  const engine = new MemoryEngine();

  // User Alice stores private convention
  await engine.remember(
    {
      content: 'Alice secret development server endpoint is https://dev-internal.alice.corp',
      importance: 0.9
    },
    {
      tenant_id: 'default',
      user_id: 'user_alice'
    }
  );

  // User Bob queries for development server
  const recallBob = await engine.recall({
    tenant_id: 'default',
    user_id: 'user_bob',
    query: 'development server endpoint'
  });

  assert.ok(!recallBob.context.includes('alice.corp'));
  assert.equal(recallBob.memories.length, 0);
});
