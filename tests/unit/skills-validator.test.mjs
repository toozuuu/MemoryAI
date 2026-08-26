import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillRegistry } from '../../packages/core/dist/index.js';
import path from 'node:path';

test('Skill Registry: discovers and parses all 8 specialized skills', () => {
  const skillsDir = path.join(process.cwd(), 'skills');
  const registry = new SkillRegistry(skillsDir);
  const skills = registry.listSkills();

  assert.equal(skills.length, 8);

  const skillNames = skills.map((s) => s.name);
  assert.ok(skillNames.includes('memoryai-core'));
  assert.ok(skillNames.includes('memoryai-session'));
  assert.ok(skillNames.includes('memoryai-project'));
  assert.ok(skillNames.includes('memoryai-retrieval'));
  assert.ok(skillNames.includes('memoryai-capture'));
  assert.ok(skillNames.includes('memoryai-security'));
  assert.ok(skillNames.includes('memoryai-mcp'));
  assert.ok(skillNames.includes('memoryai-maintainer'));
});

test('Skill Validator: validates all 8 skills without errors or circular dependencies', () => {
  const skillsDir = path.join(process.cwd(), 'skills');
  const registry = new SkillRegistry(skillsDir);
  const results = registry.validateAllSkills();

  assert.equal(results.length, 8);

  for (const res of results) {
    assert.equal(res.valid, true, `Skill ${res.skillName} validation failed: ${res.errors.join(', ')}`);
    assert.equal(res.errors.length, 0);
  }
});
