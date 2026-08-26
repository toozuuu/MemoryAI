export interface MemoryAIMetrics {
  // Memory counts
  totalMemories: number;
  // Retrieval
  totalRetrievals: number;
  totalRetrievalLatencyMs: number;
  totalEmbeddingLatencyMs: number;
  totalTokensSaved: number;
  totalFullDatabaseTokens: number;
  totalContextTokensInjected: number;
  // Capture quality
  captureAttempts: number;
  captureSuccesses: number;
  captureIgnored: number;
  captureConflicts: number;
  captureQuarantined: number;
  captureMerged: number;
  captureUpdated: number;
  // Recall quality
  recallHits: number;
  recallMisses: number;
  recallEmptyContext: number;
  // System events
  cacheHits: number;
  cacheMisses: number;
  securityEvents: number;
  failedOperations: number;
}

class MetricsCollector {
  private metrics: MemoryAIMetrics = {
    totalMemories: 0,
    totalRetrievals: 0,
    totalRetrievalLatencyMs: 0,
    totalEmbeddingLatencyMs: 0,
    totalTokensSaved: 0,
    totalFullDatabaseTokens: 0,
    totalContextTokensInjected: 0,
    captureAttempts: 0,
    captureSuccesses: 0,
    captureIgnored: 0,
    captureConflicts: 0,
    captureQuarantined: 0,
    captureMerged: 0,
    captureUpdated: 0,
    recallHits: 0,
    recallMisses: 0,
    recallEmptyContext: 0,
    cacheHits: 0,
    cacheMisses: 0,
    securityEvents: 0,
    failedOperations: 0
  };

  public recordMemoryCount(count: number): void {
    this.metrics.totalMemories = count;
  }

  public recordRetrieval(latencyMs: number, fullDbTokens: number, contextTokens: number, memoriesFound: number): void {
    this.metrics.totalRetrievals += 1;
    this.metrics.totalRetrievalLatencyMs += latencyMs;
    this.metrics.totalFullDatabaseTokens += fullDbTokens;
    this.metrics.totalContextTokensInjected += contextTokens;
    const saved = Math.max(0, fullDbTokens - contextTokens);
    this.metrics.totalTokensSaved += saved;
    if (memoriesFound > 0) {
      this.metrics.recallHits += 1;
    } else {
      this.metrics.recallMisses += 1;
    }
    if (contextTokens === 0 || contextTokens < 10) {
      this.metrics.recallEmptyContext += 1;
    }
  }

  public recordCapture(action: string): void {
    this.metrics.captureAttempts += 1;
    switch (action) {
      case 'CREATE':
        this.metrics.captureSuccesses += 1;
        break;
      case 'UPDATE':
      case 'SUPERSEDE':
        this.metrics.captureUpdated += 1;
        break;
      case 'MERGE':
        this.metrics.captureMerged += 1;
        break;
      case 'CONFLICT':
        this.metrics.captureConflicts += 1;
        break;
      case 'IGNORE':
        this.metrics.captureIgnored += 1;
        break;
      case 'QUARANTINE':
        this.metrics.captureQuarantined += 1;
        break;
    }
  }

  public recordEmbeddingLatency(latencyMs: number): void {
    this.metrics.totalEmbeddingLatencyMs += latencyMs;
  }

  public recordCacheHit(): void {
    this.metrics.cacheHits += 1;
  }

  public recordCacheMiss(): void {
    this.metrics.cacheMisses += 1;
  }

  public recordSecurityEvent(): void {
    this.metrics.securityEvents += 1;
  }

  public recordFailedOperation(): void {
    this.metrics.failedOperations += 1;
  }

  public getSnapshot(): MemoryAIMetrics & {
    averageRetrievalLatencyMs: number;
    tokenReductionPercentage: number;
    cacheHitRate: number;
    captureSuccessRate: number;
    recallHitRate: number;
    averageContextSizeTokens: number;
  } {
    const avgLatency =
      this.metrics.totalRetrievals > 0
        ? Number((this.metrics.totalRetrievalLatencyMs / this.metrics.totalRetrievals).toFixed(2))
        : 0;

    const reductionPercent =
      this.metrics.totalFullDatabaseTokens > 0
        ? Number(
            (
              (this.metrics.totalTokensSaved / this.metrics.totalFullDatabaseTokens) *
              100
            ).toFixed(2)
          )
        : 0;

    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const hitRate =
      totalCacheRequests > 0
        ? Number(((this.metrics.cacheHits / totalCacheRequests) * 100).toFixed(2))
        : 0;

    const captureSuccessRate =
      this.metrics.captureAttempts > 0
        ? Number(((this.metrics.captureSuccesses / this.metrics.captureAttempts) * 100).toFixed(2))
        : 0;

    const recallHitRate =
      this.metrics.totalRetrievals > 0
        ? Number(((this.metrics.recallHits / this.metrics.totalRetrievals) * 100).toFixed(2))
        : 0;

    const averageContextSizeTokens =
      this.metrics.totalRetrievals > 0
        ? Number((this.metrics.totalContextTokensInjected / this.metrics.totalRetrievals).toFixed(2))
        : 0;

    return {
      ...this.metrics,
      averageRetrievalLatencyMs: avgLatency,
      tokenReductionPercentage: reductionPercent,
      cacheHitRate: hitRate,
      captureSuccessRate,
      recallHitRate,
      averageContextSizeTokens
    };
  }

  public reset(): void {
    this.metrics = {
      totalMemories: 0,
      totalRetrievals: 0,
      totalRetrievalLatencyMs: 0,
      totalEmbeddingLatencyMs: 0,
      totalTokensSaved: 0,
      totalFullDatabaseTokens: 0,
      totalContextTokensInjected: 0,
      captureAttempts: 0,
      captureSuccesses: 0,
      captureIgnored: 0,
      captureConflicts: 0,
      captureQuarantined: 0,
      captureMerged: 0,
      captureUpdated: 0,
      recallHits: 0,
      recallMisses: 0,
      recallEmptyContext: 0,
      cacheHits: 0,
      cacheMisses: 0,
      securityEvents: 0,
      failedOperations: 0
    };
  }
}

export const metrics = new MetricsCollector();
