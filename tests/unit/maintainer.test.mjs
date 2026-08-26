import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillRegistry, EmbeddingMigrator, MemoryEngine } from '../../packages/core/dist/index.js';

test('Maintainer Analysis: inspects skill health and embedding index status', () => {
  const registry = new SkillRegistry();
  const validationResults = registry.validateAllSkills();

  assert.ok(validationResults.length >= 8);
  const allValid = validationResults.every((r) => r.valid);
  assert.equal(allValid, true);

  const engine = new MemoryEngine();
  const migrator = new EmbeddingMigrator(engine.storage);
  const status = migrator.getStatus(engine.embeddingProvider);

  assert.ok(status);
  assert.equal(status.isCompatible, true);
  assert.equal(status.needsMigration, false);
});
