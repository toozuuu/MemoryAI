import { AuthUser, Memory } from '@sachin97317/types';
export declare class AuthorizationError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare function assertTenantAccess(user: AuthUser, tenantId: string): void;
export declare function assertUserAccess(user: AuthUser, targetUserId: string): void;
export declare function assertProjectAccess(user: AuthUser, projectId?: string | null): void;
export declare function authorizeMemoryAccess(user: AuthUser, memory: Memory, operation: 'read' | 'write' | 'delete'): void;
//# sourceMappingURL=rbac.d.ts.map