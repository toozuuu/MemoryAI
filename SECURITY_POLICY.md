# Security Operations & Threat Model

## Threat Model & Mitigations

| Threat Vector | Mitigation in MemoryAI |
|---|---|
| **Cross-Tenant / Cross-User Memory Theft (IDOR)** | Enforced tenant & user verification on every read, write, search, and recall operation (`packages/security/src/rbac.ts`). |
| **Prompt Injection via Stored Memory** | Historical memories are framed in `<MEMORY_DATA>` containers with instruction defanging (`packages/security/src/prompt-injection.ts`). |
| **Server-Side Request Forgery (SSRF)** | Destination URL validation and DNS resolution blocking RFC1918, loopback, and cloud metadata (`packages/security/src/ssrf.ts`). |
| **Denial of Service / Resource Exhaustion** | In-memory sliding-window token bucket rate limiter (`packages/security/src/rate-limiter.ts`) and strict token budget enforcement. |
| **Decompression Bomb in .memorypack** | Strict decompression size ceiling (`maxOutputLength`) and path traversal sanitization during unpack. |
| **Sensitive Data Exposure in Logs** | Pino structured logger configured with automatic redaction paths for keys, passwords, tokens, and raw memories. |

## Credential Rotation & Secret Management

- Master encryption keys and API keys must be injected via environment variables or secret vaults.
- Never commit credentials to version control.
- In production, rotate API keys at minimum every 90 days.
