import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUrlForSSRF, SSRFError } from '../../packages/security/dist/index.js';

test('Security SSRF: blocks localhost and 127.0.0.1', async () => {
  await assert.rejects(
    async () => validateUrlForSSRF('http://localhost:3000/api'),
    SSRFError
  );

  await assert.rejects(
    async () => validateUrlForSSRF('http://127.0.0.1:8080'),
    SSRFError
  );
});

test('Security SSRF: blocks cloud metadata endpoint (169.254.169.254)', async () => {
  await assert.rejects(
    async () => validateUrlForSSRF('http://169.254.169.254/latest/meta-data/'),
    SSRFError
  );
});

test('Security SSRF: blocks non-HTTP protocols like file:// and gopher://', async () => {
  await assert.rejects(
    async () => validateUrlForSSRF('file:///etc/passwd'),
    SSRFError
  );
  await assert.rejects(
    async () => validateUrlForSSRF('gopher://127.0.0.1'),
    SSRFError
  );
});
