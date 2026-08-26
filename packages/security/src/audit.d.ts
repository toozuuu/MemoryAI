import { AuditLogEntry } from '@memoryai/types';
export interface AuditSink {
    record(entry: AuditLogEntry): Promise<void> | void;
}
export declare class InMemoryAuditSink implements AuditSink {
    private logs;
    record(entry: AuditLogEntry): void;
    getLogs(filter?: {
        tenant_id?: string;
        user_id?: string;
        action?: string;
        limit?: number;
    }): AuditLogEntry[];
}
export declare class AuditLogger {
    private sink;
    constructor(sink?: AuditSink);
    log(params: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
}
//# sourceMappingURL=audit.d.ts.map