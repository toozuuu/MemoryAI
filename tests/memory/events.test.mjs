import test from 'node:test';
import assert from 'node:assert/strict';
import { EventNormalizer, eventNormalizer } from '../../packages/memory-engine/dist/event-normalizer.js';
import { MemoryEngine } from '../../packages/core/dist/engine.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/sqlite-storage.js';

test('Event System: Normalizes raw events and assigns importance and policy actions', () => {
  const norm = new EventNormalizer();

  const ev1 = norm.normalizeRawEvent({
    type: 'architecture.changed',
    content: 'Migrated database layer to SQLite WAL mode with FTS5 virtual tables.',
    project_id: 'proj_test'
  });

  assert.equal(ev1.type, 'architecture.changed');
  assert.equal(ev1.policy_action, 'immediate');
  assert.equal(ev1.importance >= 0.9, true);

  const ev2 = norm.normalizeRawEvent({
    type: 'file.changed',
    content: 'Updated index.html title attribute'
  });

  assert.equal(ev2.policy_action, 'observe');

  const ev3 = norm.normalizeRawEvent({
    type: 'session.started',
    content: 'Hello, how can I help you today?'
  });

  assert.equal(ev3.policy_action, 'observe');
});

test('Event System: Converts eligible events into memory candidates', () => {
  const norm = new EventNormalizer();

  const ev = norm.normalizeRawEvent({
    type: 'decision.created',
    content: 'Selected TypeScript and Fastify for API service framework.',
    project_id: 'proj_api'
  });

  const candidate = norm.eventToCandidate(ev);
  assert.ok(candidate);
  assert.equal(candidate.type, 'decision');
  assert.equal(candidate.content.includes('Selected TypeScript'), true);
  assert.equal(candidate.project_id, 'proj_api');
});

test('Event System: MemoryEngine processEvent stores eligible events reactively', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  const res = await engine.processEvent({
    type: 'architecture.changed',
    content: 'Project standardized on Angular 20 and TailwindCSS 4.',
    project_id: 'proj_frontend'
  });

  assert.ok(res.event);
  assert.equal(res.event.type, 'architecture.changed');
  assert.ok(res.memory);
  assert.equal(res.memory.content.includes('Angular 20'), true);

  // Check that event is stored in database
  const events = storage.listEvents({ project_id: 'proj_frontend' });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'architecture.changed');

  storage.close();
});
