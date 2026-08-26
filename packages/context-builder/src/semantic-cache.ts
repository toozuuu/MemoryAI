import { RecallResult } from '@sachin97317/types';
import { hashContent } from '@sachin97317/security';

export interface CacheKeyParams {
  tenantId: string;
  userId: string;
  projectId?: string | null;
  namespace?: string | null;
  query: string;
  maxTokens?: number;
  minScore?: number;
}

export interface CachedRetrievalEntry {
  fingerprint: string;
  result: RecallResult;
  createdAtMs: number;
  expiresAtMs: number;
  version: number;
}

export class SemanticContextCache {
  private cache: Map<string, CachedRetrievalEntry> = new Map();
  private defaultTtlMs: number;
  private currentVersion = 1;

  constructor(ttlSeconds = 300) {
    this.defaultTtlMs = ttlSeconds * 1000;
  }

  public computeFingerprint(params: CacheKeyParams): string {
    const raw = `${params.tenantId}:${params.userId}:${params.projectId || 'all'}:${params.namespace || 'default'}:${params.maxTokens || 1000}:${params.minScore || 0.2}:${params.query.trim().toLowerCase()}`;
    return hashContent(raw);
  }

  public get(params: CacheKeyParams): RecallResult | null {
    const key = this.computeFingerprint(params);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAtMs || entry.version < this.currentVersion) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  public set(params: CacheKeyParams, result: RecallResult, customTtlSeconds?: number): void {
    const key = this.computeFingerprint(params);
    const ttl = customTtlSeconds ? customTtlSeconds * 1000 : this.defaultTtlMs;
    const now = Date.now();

    this.cache.set(key, {
      fingerprint: key,
      result,
      createdAtMs: now,
      expiresAtMs: now + ttl,
      version: this.currentVersion
    });
  }

  public invalidateAll(): void {
    this.currentVersion++;
    this.cache.clear();
  }

  public invalidateProject(projectId: string): void {
    // Invalidate project records on mutation
    this.currentVersion++;
  }

  public size(): number {
    return this.cache.size;
  }
}

export const semanticContextCache = new SemanticContextCache();
