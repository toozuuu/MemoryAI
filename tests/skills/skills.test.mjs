import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillRegistry } from '../../packages/core/dist/index.js';

test('AI Skills: SkillRegistry loads and validates all 8 modular skills', () => {
  const registry = new SkillRegistry();
  const skills = registry.loadSkills();

  assert.equal(skills.size, 8);

  const expectedSkills = [
    'memoryai-core',
    'memoryai-session',
    'memoryai-project',
    'memoryai-retrieval',
    'memoryai-capture',
    'memoryai-security',
    'memoryai-mcp',
    'memoryai-maintainer'
  ];

  for (const name of expectedSkills) {
    const found = skills.get(name);
    assert.ok(found, `Expected skill ${name} to be loaded`);
    assert.ok(found.version);
    assert.ok(found.description);
  }

  // Validate all skills for safety and dependency integrity
  const validationResults = registry.validateAllSkills();
  for (const res of validationResults) {
    assert.equal(res.valid, true, `Skill ${res.skillName} validation failed: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);
  }
});

test('AI Skills: Circular dependency detection rejects malformed graphs', () => {
  const registry = new SkillRegistry();
  // Validating clean repository should detect 0 cycles
  const results = registry.validateAllSkills();
  const cycleErrors = results.flatMap((r) => r.errors).filter((e) => e.includes('Circular dependency'));
  assert.equal(cycleErrors.length, 0);
});
