import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBoundedContext, estimateTokens } from '../../packages/context-builder/dist/index.js';

test('Token Budget: Context never exceeds requested maxTokens (300, 500, 1000, 2000, 5000)', () => {
  // Generate 50 mock ranked results
  const rankedResults = [];
  for (let i = 1; i <= 50; i++) {
    rankedResults.push({
      memory: {
        id: `mem_${i}`,
        content: `Architectural specification item ${i}: We configure service replica ${i} with strict health checks and automated restart policies.`,
        importance: 0.8,
        confidence: 1.0,
        status: 'active',
        type: 'decision',
        content_hash: `hash_${i}`
      },
      score: 0.9 - i * 0.01
    });
  }

  const budgets = [300, 500, 1000, 2000, 5000];

  for (const maxTokens of budgets) {
    const result = buildBoundedContext(rankedResults, { maxTokens });
    const actualTokens = estimateTokens(result.context);
    assert.ok(
      actualTokens <= maxTokens + 50, // Small allowance for header framing tags
      `Budget of ${maxTokens} exceeded: got ${actualTokens} tokens`
    );
    assert.ok(result.memories.length > 0);
  }
});

test('Token Budget: minScore cutoff filters out weakly relevant results', () => {
  const rankedResults = [
    {
      memory: { id: 'm1', content: 'Highly relevant postgres fact', content_hash: 'h1', importance: 0.9 },
      score: 0.85
    },
    {
      memory: { id: 'm2', content: 'Weakly related font styling note', content_hash: 'h2', importance: 0.5 },
      score: 0.10
    }
  ];

  // Without minScore: both fit within 1000 tokens
  const res1 = buildBoundedContext(rankedResults, { maxTokens: 1000, minScore: 0.0 });
  assert.equal(res1.memories.length, 2);

  // With minScore = 0.20: m2 is excluded
  const res2 = buildBoundedContext(rankedResults, { maxTokens: 1000, minScore: 0.20 });
  assert.equal(res2.memories.length, 1);
  assert.equal(res2.memories[0].id, 'm1');
});
