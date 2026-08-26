export const BENCHMARK_SEEDS = [
  {
    id: 'seed_db_postgres',
    content: 'We use PostgreSQL 16 with pgvector extension for vector storage and relational data',
    type: 'decision',
    scope: 'project',
    project_id: 'proj_alpha',
    importance: 0.95,
    entities: ['PostgreSQL', 'pgvector', 'relational data', 'database engine', 'vector storage'],
    topics: ['database', 'storage', 'vectors']
  },
  {
    id: 'seed_framework_fastify',
    content: 'The backend microservice is built using Fastify v4 with TypeScript and Pino logging',
    type: 'decision',
    scope: 'project',
    project_id: 'proj_alpha',
    importance: 0.95,
    entities: ['Fastify', 'TypeScript', 'Pino', 'web framework', 'server framework', 'logging library'],
    topics: ['backend', 'architecture', 'web server', 'logging']
  },
  {
    id: 'seed_auth_jwt',
    content: 'Authentication uses asymmetric RS256 JWT tokens with 15 minute lifespan and refresh rotation',
    type: 'decision',
    scope: 'project',
    project_id: 'proj_alpha',
    importance: 0.90,
    entities: ['JWT', 'RS256', 'refresh rotation', 'auth', 'signing algorithm', 'expiration duration', 'user tokens'],
    topics: ['security', 'authentication', 'tokens']
  },
  {
    id: 'seed_frontend_angular',
    content: 'The user portal frontend is built on Angular 20 with Tailwind CSS and standalone components',
    type: 'decision',
    scope: 'project',
    project_id: 'proj_beta',
    importance: 0.90,
    entities: ['Angular', 'Tailwind CSS', 'standalone components'],
    topics: ['frontend']
  },
  {
    id: 'seed_pref_darkmode',
    content: 'User preference: Sachin always prefers dark mode and JetBrains Mono monospace font',
    type: 'preference',
    scope: 'user',
    project_id: null,
    importance: 0.85,
    entities: ['Sachin', 'dark mode', 'JetBrains Mono'],
    topics: ['preference', 'ui']
  },
  {
    id: 'seed_pref_spaces',
    content: 'User preference: Always format TypeScript files with 2 spaces indentation and trailing commas',
    type: 'preference',
    scope: 'user',
    project_id: null,
    importance: 0.80,
    entities: ['TypeScript', 'indentation', 'spaces'],
    topics: ['preference', 'formatting']
  }
];

export const BENCHMARK_QUERIES = [
  // 1. Direct Keyword Queries
  {
    query: 'PostgreSQL pgvector relational database vectors',
    projectId: 'proj_alpha',
    expectedIds: ['seed_db_postgres'],
    category: 'direct-keyword'
  },
  {
    query: 'Fastify TypeScript Pino backend microservice',
    projectId: 'proj_alpha',
    expectedIds: ['seed_framework_fastify'],
    category: 'direct-keyword'
  },
  {
    query: 'JWT RS256 authentication refresh token lifespan',
    projectId: 'proj_alpha',
    expectedIds: ['seed_auth_jwt'],
    category: 'direct-keyword'
  },

  // 2. Semantic Paraphrase Queries
  {
    query: 'What database engine and vector storage extension do we use for relational data?',
    projectId: 'proj_alpha',
    expectedIds: ['seed_db_postgres'],
    category: 'semantic-paraphrase'
  },
  {
    query: 'Which web server framework and TypeScript logging library are configured for the backend?',
    projectId: 'proj_alpha',
    expectedIds: ['seed_framework_fastify'],
    category: 'semantic-paraphrase'
  },
  {
    query: 'What signing algorithm and expiration duration are used for user auth tokens?',
    projectId: 'proj_alpha',
    expectedIds: ['seed_auth_jwt'],
    category: 'semantic-paraphrase'
  },

  // 3. User Preference Inquiries
  {
    query: 'Sachin dark mode JetBrains Mono font UI preference',
    projectId: null,
    expectedIds: ['seed_pref_darkmode'],
    category: 'user-preference'
  },
  {
    query: 'TypeScript 2 spaces indentation trailing commas formatting style',
    projectId: null,
    expectedIds: ['seed_pref_spaces'],
    category: 'user-preference'
  },

  // 4. Cross-Project Negative Traps (Angular is in Beta, must not return in Alpha)
  {
    query: 'Angular 20 frontend components architecture in project alpha',
    projectId: 'proj_alpha',
    expectedIds: [],
    category: 'cross-project-trap'
  },

  // 5. Irrelevant Noise Queries
  {
    query: 'What is the capital city of France?',
    projectId: 'proj_alpha',
    expectedIds: [],
    category: 'noise-suppression'
  }
];
