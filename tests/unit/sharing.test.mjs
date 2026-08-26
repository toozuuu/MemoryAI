import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEngine } from '../../packages/core/dist/index.js';

test('Targeted Sharing: records and lists scoped shares', async () => {
  const engine = new MemoryEngine();
  const userId = 'dev-sachin';

  // Share a project context with another user
  const share = await engine.shareMemory({
    project_id: 'proj_frontend_app',
    target_user_id: 'dev-alice',
    permissions: 'read'
  });

  assert.ok(share.id);
  assert.equal(share.project_id, 'proj_frontend_app');
  assert.equal(share.target_user_id, 'dev-alice');
  assert.equal(share.permissions, 'read');

  // List shares
  const shares = engine.listShares({ project_id: 'proj_frontend_app' });
  assert.ok(shares.length >= 1);
  assert.equal(shares[0].target_user_id, 'dev-alice');
});
