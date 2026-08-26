import test from 'node:test';
import assert from 'node:assert/strict';
import { metrics } from '../../packages/observability/dist/index.js';
import { MemoryEngine } from '../../packages/core/dist/index.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/index.js';

test('MetricsCollector: Records capture actions and computes capture success rate', () => {
  metrics.reset();

  metrics.recordCapture('CREATE');
  metrics.recordCapture('CREATE');
  metrics.recordCapture('UPDATE');
  metrics.recordCapture('IGNORE');
  metrics.recordCapture('QUARANTINE');

  const snapshot = metrics.getSnapshot();
  assert.equal(snapshot.captureAttempts, 5);
  assert.equal(snapshot.captureSuccesses, 2);
  assert.equal(snapshot.captureUpdated, 1);
  assert.equal(snapshot.captureIgnored, 1);
  assert.equal(snapshot.captureQuarantined, 1);
  assert.equal(snapshot.captureSuccessRate, 40); // 2/5 * 100
});

test('MetricsCollector: Records recall events and computes recall hit rate and context size', () => {
  metrics.reset();

  metrics.recordRetrieval(15, 10000, 300, 2); // hit
  metrics.recordRetrieval(10, 10000, 0, 0);   // miss

  const snapshot = metrics.getSnapshot();
  assert.equal(snapshot.totalRetrievals, 2);
  assert.equal(snapshot.recallHits, 1);
  assert.equal(snapshot.recallMisses, 1);
  assert.equal(snapshot.recallHitRate, 50);
  assert.equal(snapshot.averageContextSizeTokens, 150); // (300+0)/2
  assert.equal(snapshot.averageRetrievalLatencyMs, 12.5); // (15+10)/2
});

test('MemoryEngine: Automatically updates metrics during remember and recall operations', async () => {
  metrics.reset();
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  const context = { tenant_id: 't1', user_id: 'u1', project_id: 'p1' };

  await engine.remember({ content: 'We use Vite for builds', importance: 0.9 }, context);
  await engine.recall({ tenant_id: 't1', user_id: 'u1', query: 'build tool', project_id: 'p1' });

  const snapshot = metrics.getSnapshot();
  assert.ok(snapshot.captureAttempts >= 1);
  assert.ok(snapshot.totalRetrievals >= 1);
  assert.ok(snapshot.recallHits >= 1);

  storage.close();
});
