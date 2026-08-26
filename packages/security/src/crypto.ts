import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

export function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(masterSecret, salt, KEY_LENGTH);
}

export function encryptField(plainText: string, masterSecret: string): string {
  if (!plainText) return plainText;
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(masterSecret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Payload: salt (32) + iv (16) + tag (16) + encrypted
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decryptField(cipherTextBase64: string, masterSecret: string): string {
  if (!cipherTextBase64) return cipherTextBase64;
  const buffer = Buffer.from(cipherTextBase64, 'base64');

  if (buffer.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid ciphertext payload: insufficient length');
  }

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(masterSecret, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key, 'utf8').digest('hex');
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    salt,
    hash: derivedKey.toString('hex')
  };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
  const hashBuffer = Buffer.from(hash, 'hex');

  if (keyBuffer.length !== hashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, hashBuffer);
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
