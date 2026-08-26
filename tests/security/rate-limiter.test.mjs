import test from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from '../../packages/security/dist/index.js';

test('Security Rate Limiter: throttles after threshold is reached', () => {
  const limiter = new RateLimiter({ maxRequests: 5, windowMs: 10000 });
  const key = '192.168.1.50';

  for (let i = 0; i < 5; i++) {
    const res = limiter.isAllowed(key);
    assert.equal(res.allowed, true);
  }

  // 6th request should be blocked
  const blocked = limiter.isAllowed(key);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.resetMs > 0);
});
