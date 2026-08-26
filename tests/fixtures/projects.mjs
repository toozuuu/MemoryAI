export const FIXTURE_PROJECTS = {
  backendFastify: {
    id: 'proj_backend_fastify',
    name: 'backend-api-gateway',
    source: 'git-remote',
    rootPath: '/projects/backend-api-gateway',
    gitRemote: 'github.com/acme/backend-api-gateway',
    stack: 'Fastify, TypeScript, PostgreSQL, Docker'
  },
  frontendAngular: {
    id: 'proj_frontend_angular',
    name: 'web-portal-frontend',
    source: 'package-manifest',
    rootPath: '/projects/web-portal-frontend',
    gitRemote: 'github.com/acme/web-portal-frontend',
    stack: 'Angular 20, TypeScript, RxJS, Tailwind'
  },
  legacyMicroservice: {
    id: 'proj_legacy_mysql',
    name: 'legacy-billing-service',
    source: 'workspace-hash',
    rootPath: '/projects/legacy-billing',
    gitRemote: 'github.com/acme/legacy-billing',
    stack: 'Express, MySQL 8, Redis'
  },
  externalProject: {
    id: 'proj_external_isolated',
    name: 'third-party-integration',
    source: 'git-remote',
    rootPath: '/projects/third-party',
    gitRemote: 'github.com/globex/third-party',
    stack: 'Python, FastAPI, MongoDB'
  }
};
