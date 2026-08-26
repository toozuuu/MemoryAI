class MetricsCollector {
    metrics = {
        totalMemories: 0,
        totalRetrievals: 0,
        totalRetrievalLatencyMs: 0,
        totalEmbeddingLatencyMs: 0,
        totalTokensSaved: 0,
        totalFullDatabaseTokens: 0,
        totalContextTokensInjected: 0,
        cacheHits: 0,
        cacheMisses: 0,
        securityEvents: 0,
        failedOperations: 0
    };
    recordMemoryCount(count) {
        this.metrics.totalMemories = count;
    }
    recordRetrieval(latencyMs, fullDbTokens, contextTokens) {
        this.metrics.totalRetrievals += 1;
        this.metrics.totalRetrievalLatencyMs += latencyMs;
        this.metrics.totalFullDatabaseTokens += fullDbTokens;
        this.metrics.totalContextTokensInjected += contextTokens;
        const saved = Math.max(0, fullDbTokens - contextTokens);
        this.metrics.totalTokensSaved += saved;
    }
    recordEmbeddingLatency(latencyMs) {
        this.metrics.totalEmbeddingLatencyMs += latencyMs;
    }
    recordCacheHit() {
        this.metrics.cacheHits += 1;
    }
    recordCacheMiss() {
        this.metrics.cacheMisses += 1;
    }
    recordSecurityEvent() {
        this.metrics.securityEvents += 1;
    }
    recordFailedOperation() {
        this.metrics.failedOperations += 1;
    }
    getSnapshot() {
        const avgLatency = this.metrics.totalRetrievals > 0
            ? Number((this.metrics.totalRetrievalLatencyMs / this.metrics.totalRetrievals).toFixed(2))
            : 0;
        const reductionPercent = this.metrics.totalFullDatabaseTokens > 0
            ? Number(((this.metrics.totalTokensSaved / this.metrics.totalFullDatabaseTokens) *
                100).toFixed(2))
            : 0;
        const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
        const hitRate = totalCacheRequests > 0
            ? Number(((this.metrics.cacheHits / totalCacheRequests) * 100).toFixed(2))
            : 0;
        return {
            ...this.metrics,
            averageRetrievalLatencyMs: avgLatency,
            tokenReductionPercentage: reductionPercent,
            cacheHitRate: hitRate
        };
    }
    reset() {
        this.metrics = {
            totalMemories: 0,
            totalRetrievals: 0,
            totalRetrievalLatencyMs: 0,
            totalEmbeddingLatencyMs: 0,
            totalTokensSaved: 0,
            totalFullDatabaseTokens: 0,
            totalContextTokensInjected: 0,
            cacheHits: 0,
            cacheMisses: 0,
            securityEvents: 0,
            failedOperations: 0
        };
    }
}
export const metrics = new MetricsCollector();
//# sourceMappingURL=metrics.js.map