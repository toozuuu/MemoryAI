import test from 'node:test';
import assert from 'node:assert/strict';
import { PrivacyClassifier } from '../../packages/security/dist/privacy-classifier.js';

test('Privacy Classifier: Rejects RSA private keys and AWS credentials', () => {
  const classifier = new PrivacyClassifier();

  const rawKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y3
-----END RSA PRIVATE KEY-----`;

  const keyResult = classifier.classify(rawKey);
  assert.equal(keyResult.action, 'reject');
  assert.equal(keyResult.category, 'auth_secrets');

  const awsResult = classifier.classify('My AWS key is AKIAIOSFODNN7EXAMPLE for deployment');
  assert.equal(awsResult.action, 'reject');
  assert.equal(awsResult.category, 'credentials');
});

test('Privacy Classifier: Redacts JWT tokens and database connection passwords', () => {
  const classifier = new PrivacyClassifier();

  const jwt = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHpunV_wWqF_Fm_smhCEk1b_k2bM';
  const jwtResult = classifier.classify(jwt);
  assert.equal(jwtResult.action, 'redact');
  assert.equal(jwtResult.redacted_content?.includes('[REDACTED_JWT_TOKEN]'), true);

  const dbUri = 'Database uri: postgres://admin:SuperSecretPassword123!@db.internal:5432';
  const dbResult = classifier.classify(dbUri);
  assert.equal(dbResult.action, 'redact');
  assert.equal(dbResult.redacted_content?.includes('[REDACTED_PASS]'), true);
});

test('Privacy Classifier: Allows safe engineering decisions without modification', () => {
  const classifier = new PrivacyClassifier();
  const safeText = 'We standardized on Fastify and SQLite with WAL mode.';
  const result = classifier.classify(safeText);
  assert.equal(result.action, 'store');
  assert.equal(result.category, 'safe');
});
