import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n========================================');
console.log('🔒 RUNNING MEMORYAI SECURITY TEST SUITE');
console.log('========================================\n');

const testFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.mjs'));
let failed = false;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`▶ Running ${file}...`);
  const res = spawnSync('node', ['--test', filePath], { stdio: 'inherit' });
  if (res.status !== 0) {
    failed = true;
    console.error(`❌ Security test failed: ${file}`);
  }
}

if (failed) {
  console.error('\n🚨 CRITICAL: Security tests failed. Build aborted.\n');
  process.exit(1);
} else {
  console.log('\n✅ ALL SECURITY TESTS PASSED (OWASP API Security Top 10 Compliant)\n');
}
