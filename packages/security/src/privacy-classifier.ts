import { PrivacyCategory, PrivacyClassificationResult } from '@sachin97317/types';

export interface SensitivePattern {
  name: string;
  category: PrivacyCategory;
  regex: RegExp;
  action: 'reject' | 'redact' | 'encrypt' | 'quarantine' | 'store';
  replacement: string;
}

export const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // 1. Private RSA/EC Keys
  {
    name: 'Private Key',
    category: 'auth_secrets',
    regex: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH|ENCRYPTED)?\s*PRIVATE KEY-----[\s\S]+?-----END\s+(RSA|EC|DSA|OPENSSH|ENCRYPTED)?\s*PRIVATE KEY-----/gi,
    action: 'reject',
    replacement: '[REDACTED_PRIVATE_KEY]'
  },
  // 2. Cloud & API Credentials
  {
    name: 'AWS Access Key',
    category: 'credentials',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    action: 'reject',
    replacement: '[REDACTED_AWS_KEY]'
  },
  {
    name: 'Generic Bearer/API Key',
    category: 'credentials',
    regex: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    action: 'redact',
    replacement: 'api_key: "[REDACTED_SECRET]"'
  },
  {
    name: 'JWT Token',
    category: 'auth_secrets',
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    action: 'redact',
    replacement: '[REDACTED_JWT_TOKEN]'
  },
  // 3. Database Connection URIs with Passwords
  {
    name: 'Database Connection String',
    category: 'credentials',
    regex: /(postgres|postgresql|mysql|mongodb|redis):\/\/[a-zA-Z0-9_.-]+:([^@\s]+)@[a-zA-Z0-9_.-]+:[0-9]+/gi,
    action: 'redact',
    replacement: '$1://[REDACTED_USER]:[REDACTED_PASS]@[HOST]:[PORT]'
  },
  // 4. Financial Information (Credit Cards)
  {
    name: 'Credit Card',
    category: 'financial',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    action: 'reject',
    replacement: '[REDACTED_PAYMENT_CARD]'
  },
  // 5. PII: Email addresses
  {
    name: 'Email Address',
    category: 'pii',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    action: 'redact',
    replacement: '[REDACTED_EMAIL]'
  }
];

export class PrivacyClassifier {
  public classify(content: string): PrivacyClassificationResult {
    const flaggedPatterns: string[] = [];
    let dominantCategory: PrivacyCategory = 'safe';
    let dominantAction: 'reject' | 'redact' | 'encrypt' | 'quarantine' | 'store' = 'store';
    let redactedContent = content;

    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.regex.test(content)) {
        flaggedPatterns.push(pattern.name);
        // Reset regex state after test
        pattern.regex.lastIndex = 0;

        // Upgrade category severity
        if (pattern.action === 'reject') {
          dominantAction = 'reject';
          dominantCategory = pattern.category;
        } else if (dominantAction !== 'reject' && pattern.action === 'redact') {
          dominantAction = 'redact';
          dominantCategory = pattern.category;
        }

        redactedContent = redactedContent.replace(pattern.regex, pattern.replacement);
      }
    }

    const confidence = flaggedPatterns.length > 0 ? 0.95 : 1.0;

    return {
      category: dominantCategory,
      confidence,
      action: dominantAction,
      redacted_content: dominantAction === 'redact' ? redactedContent : undefined,
      flagged_patterns: flaggedPatterns
    };
  }

  public sanitizeForStorage(content: string): { safeContent: string; action: string } {
    const result = this.classify(content);
    if (result.action === 'reject') {
      throw new Error(`Content rejected by privacy policy: contains ${result.flagged_patterns.join(', ')}`);
    }
    if (result.action === 'redact' && result.redacted_content) {
      return { safeContent: result.redacted_content, action: 'redacted' };
    }
    return { safeContent: content, action: 'stored_as_is' };
  }
}

export const privacyClassifier = new PrivacyClassifier();
