# Security Policy

MemoryAI takes the security and privacy of AI agent memory extremely seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

If you discover a potential security vulnerability in MemoryAI, please report it immediately by emailing **security@memoryai.org** or submitting a confidential security advisory via GitHub.

**Please do NOT open public GitHub issues for security vulnerabilities.**

### What to Include in Your Report:
1. Description of the vulnerability (e.g. IDOR, SSRF, prompt injection bypass, authentication flaw).
2. Step-by-step reproduction steps or Proof-of-Concept script.
3. Impact assessment and suggested remediation.

### Response Timelines:
- **Acknowledgment:** Within 24 hours.
- **Initial Assessment:** Within 72 hours.
- **Remediation & Patch Release:** Within 7 days for critical vulnerabilities.

## Security Architecture & Defenses

1. **OWASP API Security Top 10 Hardened:** Strict Tenant, User, and Project authorization checks on every operation to prevent Insecure Direct Object References (IDOR).
2. **SSRF Guard:** Strict DNS verification blocking loopback (127.0.0.1), private networks (RFC1918), link-local addresses, and cloud instance metadata endpoints (`169.254.169.254`).
3. **Prompt Injection Isolation:** Retrieved memory data is strictly framed inside `<MEMORY_DATA>` containers with explicit non-executable attribution headers.
4. **Encryption at Rest:** Sensitive fields are encrypted using authenticated AES-256-GCM.
5. **Non-Root Containers:** Docker containers drop all unnecessary Linux capabilities and execute as an unprivileged non-root user (`UID 10001`).
