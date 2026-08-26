import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoundedContext, estimateTokens } from '../../packages/context-builder/dist/index.js';
import { hashContent } from '../../packages/security/dist/index.js';

test('Context Builder: strictly enforces token budget limit', () => {
  const rankedItems = [];
  for (let i = 0; i < 50; i++) {
    const text = `Memory item ${i}: Detailed historical context regarding software architecture, configuration settings, user preferences, and implementation decisions for the project.`;
    rankedItems.push({
      memory: {
        id: `mem-${i}`,
        tenant_id: 'default',
        user_id: 'u1',
        scope: 'project',
        project_id: 'p1',
        type: 'semantic',
        content: text,
        summary: null,
        entities: [],
        topics: [],
        importance: 0.8,
        confidence: 1.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        valid_from: null,
        valid_to: null,
        last_accessed_at: null,
        access_count: 0,
        source_provider: null,
        source_session_id: null,
        source_message_id: null,
        parent_memory_id: null,
        status: 'active',
        privacy_level: 'internal',
        content_hash: hashContent(text)
      },
      score: 1.0 - (i * 0.01)
    });
  }

  // Request strict 300 token budget
  const res300 = buildBoundedContext(rankedItems, { maxTokens: 300 });
  assert.ok(res300.tokenCount <= 300, `Token count ${res300.tokenCount} exceeded 300 limit`);
  assert.ok(res300.memories.length > 0);

  // Request strict 1000 token budget
  const res1000 = buildBoundedContext(rankedItems, { maxTokens: 1000 });
  assert.ok(res1000.tokenCount <= 1000, `Token count ${res1000.tokenCount} exceeded 1000 limit`);
  assert.ok(res1000.memories.length > res300.memories.length);

  // Verify memory data framing
  assert.ok(res1000.context.includes('=== BEGIN MEMORY DATA'));
  assert.ok(res1000.context.includes('<MEMORY_DATA>'));
});
