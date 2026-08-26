export class AuthorizationError extends Error {
    statusCode;
    constructor(message, statusCode = 403) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AuthorizationError';
    }
}
export function assertTenantAccess(user, tenantId) {
    if (user.role === 'admin')
        return;
    if (user.tenant_id !== tenantId) {
        throw new AuthorizationError(`Access denied: cross-tenant access prohibited`);
    }
}
export function assertUserAccess(user, targetUserId) {
    if (user.role === 'admin')
        return;
    if (user.id !== targetUserId) {
        throw new AuthorizationError(`Access denied: cross-user resource access prohibited`);
    }
}
export function assertProjectAccess(user, projectId) {
    if (!projectId || user.role === 'admin')
        return;
    if (user.project_ids && user.project_ids.length > 0) {
        if (!user.project_ids.includes(projectId)) {
            throw new AuthorizationError(`Access denied: not authorized for project ${projectId}`);
        }
    }
}
export function authorizeMemoryAccess(user, memory, operation) {
    // 1. Strict Tenant Isolation
    if (user.tenant_id !== memory.tenant_id && user.role !== 'admin') {
        throw new AuthorizationError(`Access denied to memory ${memory.id}: invalid tenant context`);
    }
    // 2. User Isolation unless admin or scope allows
    if (memory.scope === 'user' && memory.user_id !== user.id && user.role !== 'admin') {
        throw new AuthorizationError(`Access denied to memory ${memory.id}: unauthorized user`);
    }
    // 3. Project isolation
    if (memory.project_id && user.project_ids && user.project_ids.length > 0 && user.role !== 'admin') {
        if (!user.project_ids.includes(memory.project_id)) {
            throw new AuthorizationError(`Access denied to memory ${memory.id}: unauthorized project`);
        }
    }
    // 4. Role operations
    if (operation === 'delete' && user.role === 'viewer') {
        throw new AuthorizationError(`Viewers cannot delete memories`);
    }
    if (operation === 'write' && user.role === 'viewer') {
        throw new AuthorizationError(`Viewers cannot modify memories`);
    }
}
//# sourceMappingURL=rbac.js.map