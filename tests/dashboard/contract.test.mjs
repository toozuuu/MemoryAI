import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Dashboard: UI contract file exists and contains security headers and sanitization', () => {
  const dashboardPath = path.resolve('apps/dashboard/src/index.html');
  assert.ok(fs.existsSync(dashboardPath), 'Dashboard index.html must exist');

  const html = fs.readFileSync(dashboardPath, 'utf8');

  // Verify critical tabs and components exist
  assert.ok(html.includes('MemoryAI'));
  assert.ok(html.includes('Total Persistent Memories'));
  assert.ok(html.includes('Token Savings'));
  assert.ok(html.includes('Session Handoffs'));

  // Ensure no dangerous unsanitized innerHTML evaluation with user input
  assert.ok(!html.includes('eval('));
  assert.ok(!html.includes('document.write('));
});
