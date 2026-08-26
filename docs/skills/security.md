# `memoryai-security` Skill

Enforces OWASP API Top 10 security boundaries, prompt injection defanging, `<MEMORY_DATA>` isolation, SSRF defense, and anti-IDOR authorization.

## Core Protections
1. **Prompt Injection Defense:** Strict `<MEMORY_DATA>` demarcation with non-executable disclaimers and instruction defanging.
2. **Anti-IDOR:** Server-side validation of tenant, user, and project access boundaries.
3. **SSRF Guard:** DNS filter blocking loopback (`127.0.0.1`), RFC1918 subnets, and cloud metadata (`169.254.169.254`).
4. **Secret Protection:** Automatic redaction and secret scanning.

## Tools Used
- `memory_auto_context`
- `memory_recall`
