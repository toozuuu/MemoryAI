import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cmdInit,
  cmdStatus,
  cmdRemember,
  cmdRecall,
  cmdSearch,
  cmdDoctor,
  cmdSkillsValidate,
  cmdMetrics,
  cmdMemoryShow,
  cmdSecurityCheck
} from '../../cli/dist/commands.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

test('CLI: Commands execute cleanly without unhandled exceptions', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));

  // 1. Init
  await cmdInit({ dataDir: tempDir });
  assert.ok(fs.existsSync(path.join(tempDir, 'memoryai.db')));

  // 2. Remember
  await cmdRemember('We use Fastify v4 with TypeScript', { dataDir: tempDir });

  // 3. Recall
  await cmdRecall('Fastify backend framework', { dataDir: tempDir });

  // 4. Search
  await cmdSearch('Fastify', { dataDir: tempDir });

  // 5. Status
  await cmdStatus({ dataDir: tempDir });

  // 6. Metrics
  await cmdMetrics({ dataDir: tempDir });

  // 7. Doctor
  await cmdDoctor({ dataDir: tempDir });

  // 8. Skills Validate
  const skillsValid = await cmdSkillsValidate();
  assert.equal(skillsValid, true);

  // 9. Security Check
  await cmdSecurityCheck();

  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
});
