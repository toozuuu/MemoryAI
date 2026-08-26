import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCandidateScore, classifyMemoryType, extractEntitiesAndTopics } from '../../packages/extraction/dist/index.js';

test('Extraction: candidate scoring handles durable preference', () => {
  const evalResult = evaluateCandidateScore({
    content: 'I always prefer using Angular and TypeScript for web applications.'
  });

  assert.equal(evalResult.isTransient, false);
  assert.ok(evalResult.importance >= 0.85);
  assert.ok(evalResult.durability >= 0.9);
  assert.ok(evalResult.score >= 0.80);
});

test('Extraction: candidate scoring ignores transient greetings', () => {
  const evalResult = evaluateCandidateScore({
    content: 'Hello, how are you today?'
  });

  assert.equal(evalResult.isTransient, true);
  assert.ok(evalResult.score < 0.35);
});

test('Extraction: entity and topic extractor identifies tech stack', () => {
  const { entities, topics } = extractEntitiesAndTopics(
    'We chose SQLite with FTS5 and Fastify for our backend database.'
  );

  assert.ok(topics.includes('database'));
  assert.ok(topics.includes('backend'));
  assert.ok(entities.includes('SQLite') || entities.includes('FTS5') || entities.includes('Fastify'));
});
