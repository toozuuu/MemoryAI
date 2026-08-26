export interface MemoryAIMetrics {
    totalMemories: number;
    totalRetrievals: number;
    totalRetrievalLatencyMs: number;
    totalEmbeddingLatencyMs: number;
    totalTokensSaved: number;
    totalFullDatabaseTokens: number;
    totalContextTokensInjected: number;
    cacheHits: number;
    cacheMisses: number;
    securityEvents: number;
    failedOperations: number;
}
declare class MetricsCollector {
    private metrics;
    recordMemoryCount(count: number): void;
    recordRetrieval(latencyMs: number, fullDbTokens: number, contextTokens: number): void;
    recordEmbeddingLatency(latencyMs: number): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    recordSecurityEvent(): void;
    recordFailedOperation(): void;
    getSnapshot(): MemoryAIMetrics & {
        averageRetrievalLatencyMs: number;
        tokenReductionPercentage: number;
        cacheHitRate: number;
    };
    reset(): void;
}
export declare const metrics: MetricsCollector;
export {};
//# sourceMappingURL=metrics.d.ts.map