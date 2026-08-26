import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';

test('Session Handoff: creates and retrieves structured session handoff', async () => {
  const engine = new MemoryEngine();
  const projectId = 'proj_test_handoff';
  const userId = 'dev-sachin';

  const handoff = await engine.createHandoff({
    project_id: projectId,
    user_id: userId,
    objective: 'Implement OAuth 2.0 PKCE flow in mobile client',
    completed_work: ['Added PKCE code challenge generation', 'Updated auth interceptor'],
    unfinished_work: ['Configure token refresh retry loop'],
    important_decisions: ['Use SHA-256 for code_challenge', 'Store refresh token in secure enclave'],
    current_architecture: 'Mobile React Native client with Fastify auth backend',
    relevant_files: ['src/auth/pkce.ts', 'src/auth/interceptor.ts'],
    next_actions: ['Write unit tests for refresh loop']
  });

  assert.ok(handoff.id);
  assert.equal(handoff.project_id, projectId);
  assert.equal(handoff.objective, 'Implement OAuth 2.0 PKCE flow in mobile client');
  assert.equal(handoff.completed_work.length, 2);

  // Retrieve latest handoff
  const latest = engine.getLatestHandoff(projectId, userId);
  assert.ok(latest);
  assert.equal(latest.id, handoff.id);
  assert.equal(latest.important_decisions.length, 2);

  // List handoffs
  const list = engine.listHandoffs(projectId, userId);
  assert.equal(list.length, 1);
});

test('Session Handoff: recall automatically injects handoff context for project', async () => {
  const engine = new MemoryEngine();
  const projectId = 'proj_test_recall_handoff';
  const userId = 'dev-sachin';

  await engine.createHandoff({
    project_id: projectId,
    user_id: userId,
    objective: 'Refactor database persistence layer',
    important_decisions: ['Standardized on SQLite FTS5 for search'],
    unfinished_work: ['Add vector migration scripts']
  });

  const recallResult = await engine.recall({
    tenant_id: 'default',
    user_id: userId,
    project_id: projectId,
    query: 'database persistence refactoring',
    includeHandoff: true
  });

  assert.ok(recallResult.handoff);
  assert.ok(recallResult.context.includes('[Session Handoff'));
  assert.ok(recallResult.context.includes('Refactor database persistence layer'));
  assert.ok(recallResult.context.includes('SQLite FTS5'));
});
