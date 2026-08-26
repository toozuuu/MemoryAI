import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryBrain } from '../../packages/memory-engine/dist/index.js';
import { hashContent } from '../../packages/security/dist/index.js';

test('Memory Brain: decides CREATE for novel durable memory', () => {
  const candidate = {
    content: 'User prefers dark mode and JetBrains Mono monospace font.',
    importance: 0.9,
    durability: 0.9
  };

  const decision = memoryBrain.decide(candidate, []);
  assert.equal(decision.action, 'CREATE');
});

test('Memory Brain: decides IGNORE for exact duplicate memory', () => {
  const content = 'User prefers dark mode';
  const existing = [{
    id: 'mem-1',
    tenant_id: 'default',
    user_id: 'u1',
    scope: 'user',
    project_id: null,
    type: 'preference',
    content,
    summary: null,
    entities: [],
    topics: [],
    importance: 0.9,
    confidence: 1.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    valid_from: new Date().toISOString(),
    valid_to: null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_session_id: null,
    source_message_id: null,
    parent_memory_id: null,
    status: 'active',
    privacy_level: 'internal',
    content_hash: hashContent(content)
  }];

  const decision = memoryBrain.decide({ content }, existing);
  assert.equal(decision.action, 'IGNORE');
});

test('Memory Brain: decides CONFLICT on contradictory technology switch', () => {
  const oldContent = 'Project uses React 18 for client architecture';
  const newContent = 'Instead of React, switched from React to Angular for all client architecture';
  
  const existing = [{
    id: 'mem-react',
    tenant_id: 'default',
    user_id: 'u1',
    scope: 'project',
    project_id: 'p1',
    type: 'decision',
    content: oldContent,
    summary: null,
    entities: ['React', 'architecture'],
    topics: ['frontend'],
    importance: 0.9,
    confidence: 1.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    valid_from: '2024-01-01T00:00:00.000Z',
    valid_to: null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: null,
    source_session_id: null,
    source_message_id: null,
    parent_memory_id: null,
    status: 'active',
    privacy_level: 'internal',
    content_hash: hashContent(oldContent)
  }];

  const decision = memoryBrain.decide(
    { content: newContent, entities: ['React', 'Angular', 'architecture'] },
    existing
  );

  assert.ok(decision.action === 'CONFLICT' || decision.action === 'SUPERSEDE');
  assert.equal(decision.target_memory_id, 'mem-react');
});
