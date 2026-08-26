import { BrainDecision, Memory, MemoryCandidate, MemoryFilter, MemorySearchResult, RecallRequest, RecallResult } from '@memoryai/types';
import { SqliteMemoryStorage } from '@memoryai/storage-sqlite';
import { EmbeddingProvider } from '@memoryai/embeddings';
import { ConsolidationResult } from '@memoryai/consolidation';
export interface MemoryEngineConfig {
    storage?: SqliteMemoryStorage;
    embeddingProvider?: EmbeddingProvider;
    defaultMaxTokens?: number;
}
export declare class MemoryEngine {
    storage: SqliteMemoryStorage;
    embeddingProvider: EmbeddingProvider;
    defaultMaxTokens: number;
    constructor(config?: MemoryEngineConfig);
    remember(candidate: MemoryCandidate, context: {
        tenant_id: string;
        user_id: string;
        project_id?: string | null;
    }): Promise<{
        memory?: Memory;
        decision: BrainDecision;
    }>;
    recall(request: RecallRequest): Promise<RecallResult>;
    search(query: string, filter: MemoryFilter, limit?: number): Promise<MemorySearchResult[]>;
    forget(id: string, context: {
        tenant_id: string;
        user_id: string;
    }): Promise<boolean>;
    consolidate(context: {
        tenant_id: string;
        user_id: string;
    }): Promise<ConsolidationResult>;
    timeline(context: {
        tenant_id: string;
        user_id: string;
        entity?: string;
    }): Promise<Memory[]>;
}
//# sourceMappingURL=engine.d.ts.map