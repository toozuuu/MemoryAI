export const FIXTURE_USERS = {
  alice: {
    tenant_id: 'tenant-alpha',
    organization_id: 'org-acme',
    user_id: 'user-alice',
    role: 'developer',
    email: 'alice@acme.example.com'
  },
  bob: {
    tenant_id: 'tenant-alpha',
    organization_id: 'org-acme',
    user_id: 'user-bob',
    role: 'developer',
    email: 'bob@acme.example.com'
  },
  charlieCrossTenant: {
    tenant_id: 'tenant-beta',
    organization_id: 'org-globex',
    user_id: 'user-charlie',
    role: 'developer',
    email: 'charlie@globex.example.com'
  },
  adminUser: {
    tenant_id: 'tenant-alpha',
    organization_id: 'org-acme',
    user_id: 'user-admin',
    role: 'admin',
    email: 'admin@acme.example.com'
  },
  defaultUser: {
    tenant_id: 'default',
    organization_id: null,
    user_id: 'default-user',
    role: 'developer',
    email: 'default@local.example.com'
  }
};
