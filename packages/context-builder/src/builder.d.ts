import { MemorySearchResult, RecallResult } from '@sachin97317/types';
export interface ContextBuilderOptions {
    maxTokens?: number;
    includeMetadata?: boolean;
    totalDbMemoriesCount?: number;
    totalDbTokensEstimated?: number;
}
export declare function buildBoundedContext(rankedResults: MemorySearchResult[], options?: ContextBuilderOptions): RecallResult;
//# sourceMappingURL=builder.d.ts.map