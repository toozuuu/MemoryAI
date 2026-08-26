import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUrlForSSRF, RateLimiter } from '../../packages/security/dist/index.js';

test('Security SSRF: Rejects loopback, link-local, cloud metadata, and private IP ranges', async () => {
  const blockedUrls = [
    'http://127.0.0.1:8080/admin',
    'http://localhost:3000/api',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/internal',
    'http://192.168.1.1/router',
    'file:///etc/passwd',
    'gopher://127.0.0.1:6379/_flushall'
  ];

  for (const url of blockedUrls) {
    await assert.rejects(
      async () => validateUrlForSSRF(url),
      (err) => {
        assert.ok(err.name === 'SSRFError' || err.message.includes('SSRF') || err.message.includes('Blocked'));
        return true;
      },
      `Expected ${url} to be blocked by SSRF defense`
    );
  }
});

test('Security Rate Limiter: Sliding-window throttles requests exceeding rate quota', () => {
  const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  const ip = '198.51.100.42';

  assert.equal(limiter.isAllowed(ip).allowed, true);
  assert.equal(limiter.isAllowed(ip).allowed, true);
  assert.equal(limiter.isAllowed(ip).allowed, true);

  // 4th request within window must be blocked
  const res4 = limiter.isAllowed(ip);
  assert.equal(res4.allowed, false);
  assert.equal(res4.remaining, 0);
  assert.ok(res4.resetMs > 0);
});
