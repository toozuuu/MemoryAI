export const FIXTURE_HANDOFFS = {
  standardSessionHandoff: {
    project_id: 'proj_backend_fastify',
    session_id: 'sess_auth_migration_001',
    objective: 'Implement OAuth2 and JWT token rotation for API gateway',
    completed_work: [
      'Configured Fastify auth plugin',
      'Implemented RS256 token verification middleware',
      'Created SQLite refresh token store'
    ],
    unfinished_work: [
      'Write end-to-end integration tests for token expiry',
      'Configure Redis cache for revoked token blacklist'
    ],
    important_decisions: [
      'Access token lifetime set to 15 minutes',
      'Refresh tokens rotated on every renewal'
    ],
    current_architecture: 'Fastify v4 gateway with RS256 asymmetric JWT verification',
    relevant_files: [
      'packages/security/src/jwt.ts',
      'apps/api/src/routes/auth.ts'
    ],
    known_problems: [
      'Clock skew on test runner causes transient 1s token expiration'
    ],
    next_actions: [
      'Run security test suite',
      'Deploy to staging cluster'
    ],
    important_context: 'Requires RSA private key in ENVIRONMENT variable JWT_PRIVATE_KEY'
  }
};
