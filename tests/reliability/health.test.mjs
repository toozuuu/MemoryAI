import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/engine.js';
import { SqliteMemoryStorage } from '../../packages/storage-sqlite/dist/sqlite-storage.js';

test('Project Memory Health: Computes 0-100 score and diagnostic breakdown', async () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  await engine.remember({
    content: 'Standardized testing on Node.js built-in test runner.',
    type: 'decision',
    importance: 0.9
  }, { tenant_id: 't1', user_id: 'u1', project_id: 'proj_health' });

  const health = engine.getProjectHealth('proj_health');
  assert.equal(health.overall_score >= 80, true);
  assert.equal(health.components.confidence_score >= 90, true);
  assert.equal(health.metrics.total_memories, 1);
  assert.equal(health.metrics.active_conflicts, 0);
  assert.ok(health.diagnostic_summary.length > 0);

  storage.close();
});

test('Memory Integrity: Scans and reports consistency with zero errors on clean db', () => {
  const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
  const engine = new MemoryEngine({ storage });

  const report = engine.verifyIntegrity();
  assert.equal(report.status, 'healthy');
  assert.equal(report.orphaned_vectors, 0);
  assert.equal(report.broken_provenance_links, 0);
  assert.equal(report.duplicate_hashes, 0);

  storage.close();
});
