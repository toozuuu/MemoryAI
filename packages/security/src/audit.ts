import { AuditLogEntry } from '@memoryai/types';
import { generateSecureToken } from './crypto.js';

export interface AuditSink {
  record(entry: AuditLogEntry): Promise<void> | void;
}

export class InMemoryAuditSink implements AuditSink {
  private logs: AuditLogEntry[] = [];

  public record(entry: AuditLogEntry): void {
    this.logs.push(Object.freeze({ ...entry }));
  }

  public getLogs(filter?: {
    tenant_id?: string;
    user_id?: string;
    action?: string;
    limit?: number;
  }): AuditLogEntry[] {
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
  constructor(private sink: AuditSink = new InMemoryAuditSink()) {}

  public async log(params: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: generateSecureToken(16),
      timestamp: new Date().toISOString(),
      ...params
    };
    await this.sink.record(entry);
    return entry;
  }
}
