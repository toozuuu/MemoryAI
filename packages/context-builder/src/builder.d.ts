import { MemorySearchResult, RecallResult } from '@memoryai/types';
export interface ContextBuilderOptions {
    maxTokens?: number;
    includeMetadata?: boolean;
    totalDbMemoriesCount?: number;
    totalDbTokensEstimated?: number;
}
export declare function buildBoundedContext(rankedResults: MemorySearchResult[], options?: ContextBuilderOptions): RecallResult;
//# sourceMappingURL=builder.d.ts.map