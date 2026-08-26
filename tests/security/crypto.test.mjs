import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptField, decryptField, hashPassword, verifyPassword, safeCompare } from '../../packages/security/dist/index.js';

test('Security Crypto: AES-256-GCM encryption and decryption round-trip', () => {
  const secret = 'super-secure-production-master-key-32-chars';
  const text = 'Sensitive developer credentials or private tokens';

  const encrypted = encryptField(text, secret);
  assert.notEqual(encrypted, text);

  const decrypted = decryptField(encrypted, secret);
  assert.equal(decrypted, text);
});

test('Security Crypto: password hashing and verification', () => {
  const password = 'StrongPassword123!#%';
  const { hash, salt } = hashPassword(password);

  assert.ok(verifyPassword(password, hash, salt));
  assert.equal(verifyPassword('WrongPassword', hash, salt), false);
});

test('Security Crypto: timing-safe equality', () => {
  assert.equal(safeCompare('token-abc-123', 'token-abc-123'), true);
  assert.equal(safeCompare('token-abc-123', 'token-abc-xyz'), false);
});
