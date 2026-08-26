import { generateSecureToken } from './crypto.js';
export class InMemoryAuditSink {
    logs = [];
    record(entry) {
        this.logs.push(Object.freeze({ ...entry }));
    }
    getLogs(filter) {
        let result = [...this.logs];
        if (filter?.tenant_id) {
            result = result.filter((l) => l.tenant_id === filter.tenant_id);
        }
        if (filter?.user_id) {
            result = result.filter((l) => l.user_id === filter.user_id);
        }
        if (filter?.action) {
            result = result.filter((l) => l.action === filter.action);
        }
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (filter?.limit) {
            result = result.slice(0, filter.limit);
        }
        return result;
    }
}
export class AuditLogger {
    sink;
    constructor(sink = new InMemoryAuditSink()) {
        this.sink = sink;
    }
    async log(params) {
        const entry = {
            id: generateSecureToken(16),
            timestamp: new Date().toISOString(),
            ...params
        };
        await this.sink.record(entry);
        return entry;
    }
}
//# sourceMappingURL=audit.js.map