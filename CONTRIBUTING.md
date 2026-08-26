# Contributing to MemoryAI

Thank you for your interest in contributing to MemoryAI!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/memoryai/memoryai.git
   cd memoryai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the monorepo:
   ```bash
   npm run build
   ```

4. Run the full test suite and security verification:
   ```bash
   npm run test:all
   ```

## Development Guidelines

- **Zero Fake Implementations:** All modules, storage backends, and cryptographic primitives must be real, tested, and production ready.
- **Strict Token Limits:** Never bypass context token capping in context builder modules.
- **Security-First:** All changes touching authentication, authorization, or network requests must pass OWASP API security checks.
