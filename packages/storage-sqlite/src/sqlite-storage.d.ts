import { Memory, MemoryFilter } from '@sachin97317/types';
export interface SqliteStorageOptions {
    dbPath?: string;
    encryptionKey?: string;
}
export declare class SqliteMemoryStorage {
    private db;
    private dbPath;
    constructor(options?: SqliteStorageOptions);
    private initSchema;
    insert(memory: Memory): void;
    getById(id: string): Memory | null;
    update(memory: Memory): void;
    delete(id: string): void;
    list(filter?: MemoryFilter, limit?: number, offset?: number): Memory[];
    count(filter?: MemoryFilter): number;
    searchFts(query: string, filter?: MemoryFilter, limit?: number): Array<{
        memory: Memory;
        rank: number;
    }>;
    saveVector(id: string, vector: number[]): void;
    getVectors(ids?: string[]): Map<string, number[]>;
    private buildFilterClauses;
    private mapRowToMemory;
    close(): void;
}
//# sourceMappingURL=sqlite-storage.d.ts.map