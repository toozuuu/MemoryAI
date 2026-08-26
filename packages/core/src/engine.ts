import {
  BrainDecision,
  DecisionAction,
  Memory,
  MemoryCandidate,
  MemoryFilter,
  MemorySearchResult,
  RecallRequest,
  RecallResult,
  ProgressiveRecallRequest,
  ProgressiveRecallResult,
  MemoryAIEvent,
  ProjectMemoryHealth,
  IntegrityReport,
  SessionHandoff,
  CreateHandoffInput,
  MemoryShareRecord,
  ShareMemoryInput
} from '@sachin97317/types';
import { SqliteMemoryStorage } from '@sachin97317/storage-sqlite';
import { EmbeddingProvider, getEmbeddingProvider, cosineSimilarity } from '@sachin97317/embeddings';
import {
  memoryBrain,
  createMemoryFromCandidate,
  handleTemporalConflict,
  eventNormalizer,
  HealthMonitor,
  MemoryIntegrityChecker
} from '@sachin97317/memory-engine';
import { CandidateMemoryMatch, rerankMemories } from '@sachin97317/reranking';
import { buildBoundedContext, buildProgressiveContext, estimateTokens, semanticContextCache } from '@sachin97317/context-builder';
import { runMemoryConsolidation, ConsolidationResult } from '@sachin97317/consolidation';
import { logger, metrics, tracer } from '@sachin97317/observability';
import { hashContent, generateSecureToken } from '@sachin97317/security';
import { TasksManager } from './tasks-manager.js';
import { SnapshotManager } from './snapshot-manager.js';
import crypto from 'node:crypto';

export interface MemoryEngineConfig {
  storage?: SqliteMemoryStorage;
  embeddingProvider?: EmbeddingProvider;
  defaultMaxTokens?: number;
}

export class MemoryEngine {
  public storage: SqliteMemoryStorage;
  public embeddingProvider: EmbeddingProvider;
  public defaultMaxTokens: number;
  public tasks: TasksManager;
  public snapshots: SnapshotManager;
  public health: HealthMonitor;
  public integrity: MemoryIntegrityChecker;

  constructor(config: MemoryEngineConfig = {}) {
    this.storage = config.storage || new SqliteMemoryStorage();
    this.embeddingProvider = config.embeddingProvider || getEmbeddingProvider();
    this.defaultMaxTokens = config.defaultMaxTokens || 1000;
    this.tasks = new TasksManager(this.storage);
    this.snapshots = new SnapshotManager(this.storage);
    this.health = new HealthMonitor(this.storage);
    this.integrity = new MemoryIntegrityChecker(this.storage);

    // Initialize embedding metadata if missing
    const meta = this.storage.getEmbeddingMetadata();
    if (!meta) {
      this.storage.saveEmbeddingMetadata({
        model: this.embeddingProvider.name,
        version: '1.0.0',
        dimensions: this.embeddingProvider.dimensions,
        distance_metric: 'cosine',
        created_at: new Date().toISOString(),
        vector_count: this.storage.count(),
        status: 'active'
      });
    }
  }

  public async remember(
    candidate: MemoryCandidate,
    context: { tenant_id: string; user_id: string; project_id?: string | null }
  ): Promise<{ memory?: Memory; decision: BrainDecision }> {
    const span = tracer.startSpan('memory.remember');

    // 1. Fetch active memories for this tenant & user
    const existing = this.storage.list({
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      statuses: ['confirmed', 'probable', 'superseded', 'candidate', 'active']
    });

    // 2. Embed candidate
    const embedStart = Date.now();
    const candidateVector = await this.embeddingProvider.embed(candidate.content);
    metrics.recordEmbeddingLatency(Date.now() - embedStart);

    // 3. Fetch vectors for existing memories
    const existingVectors = this.storage.getVectors(existing.map((m) => m.id));

    // 4. Memory Brain decision
    const decision = memoryBrain.decide(candidate, existing, candidateVector, existingVectors);
    logger.info({ decision: decision.action, reason: decision.reason }, 'Memory Brain decision made');
    metrics.recordCapture(decision.action);

    let resultingMemory: Memory | undefined;

    switch (decision.action) {
      case 'IGNORE':
        break;

      case 'QUARANTINE': {
        resultingMemory = createMemoryFromCandidate(candidate, context);
        resultingMemory.status = 'quarantined';
        resultingMemory.verification_state = 'quarantined';
        resultingMemory.update_reason = decision.reason;
        this.storage.insert(resultingMemory);
        break;
      }

      case 'CREATE': {
        resultingMemory = createMemoryFromCandidate(candidate, context);
        this.storage.insert(resultingMemory);
        this.storage.saveVector(resultingMemory.id, candidateVector);
        break;
      }

      case 'CONFLICT': {
        const targetId = decision.target_memory_id!;
        const targetMem = this.storage.getById(targetId);
        if (targetMem) {
          const { supersededMemory, newMemory } = handleTemporalConflict(targetMem, candidate, context);
          this.storage.update(supersededMemory);
          this.storage.insert(newMemory);
          this.storage.saveVector(newMemory.id, candidateVector);
          resultingMemory = newMemory;
        } else {
          resultingMemory = createMemoryFromCandidate(candidate, context);
          this.storage.insert(resultingMemory);
          this.storage.saveVector(resultingMemory.id, candidateVector);
        }
        break;
      }

      case 'UPDATE': {
        const targetId = decision.target_memory_id!;
        const targetMem = this.storage.getById(targetId);
        if (targetMem) {
          const updated: Memory = {
            ...targetMem,
            ...(decision.suggested_memory as Partial<Memory>),
            updated_at: new Date().toISOString()
          };
          this.storage.update(updated);
          this.storage.saveVector(updated.id, candidateVector);
          resultingMemory = updated;
        }
        break;
      }

      case 'MERGE': {
        const targetId = decision.target_memory_id!;
        const targetMem = this.storage.getById(targetId);
        if (targetMem && decision.merged_content) {
          const mergedVec = await this.embeddingProvider.embed(decision.merged_content);
          const updated: Memory = {
            ...targetMem,
            content: decision.merged_content,
            content_hash: hashContent(decision.merged_content),
            updated_at: new Date().toISOString()
          };
          this.storage.update(updated);
          this.storage.saveVector(updated.id, mergedVec);
          resultingMemory = updated;
        }
        break;
      }

      case 'SUPERSEDE': {
        const targetId = decision.target_memory_id!;
        const targetMem = this.storage.getById(targetId);
        if (targetMem) {
          const { supersededMemory, newMemory } = handleTemporalConflict(targetMem, candidate, context);
          this.storage.update(supersededMemory);
          this.storage.insert(newMemory);
          this.storage.saveVector(newMemory.id, candidateVector);
          resultingMemory = newMemory;
        }
        break;
      }

      case 'ARCHIVE': {
        const targetId = decision.target_memory_id!;
        const targetMem = this.storage.getById(targetId);
        if (targetMem) {
          targetMem.status = 'archived';
          targetMem.updated_at = new Date().toISOString();
          this.storage.update(targetMem);
          resultingMemory = targetMem;
        }
        break;
      }
    }

    metrics.recordMemoryCount(this.storage.count());
    span.end();
    return { memory: resultingMemory, decision };
  }

  public async recall(request: RecallRequest): Promise<RecallResult> {
    const span = tracer.startSpan('memory.recall');
    const startMs = Date.now();

    const maxTokens = request.maxTokens || this.defaultMaxTokens;
    const filter: MemoryFilter = {
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      project_id: request.project_id,
      scope: request.scope,
      types: request.types,
      valid_at: request.temporalDate,
      statuses: request.includeSuperseded
        ? ['confirmed', 'probable', 'active', 'superseded']
        : ['confirmed', 'probable', 'active']
    };

    // 1. Fetch latest session handoff for this project if requested
    let latestHandoff: SessionHandoff | null = null;
    if (request.includeHandoff !== false && request.project_id) {
      latestHandoff = this.storage.getLatestHandoff(request.project_id, request.user_id);
    }

    // 2. FTS search
    const ftsResults = this.storage.searchFts(request.query, filter, 50);

    // 3. Vector search
    const queryVector = await this.embeddingProvider.embed(request.query);
    const candidateMemories = this.storage.list(filter, 200);
    const candidateVectors = this.storage.getVectors(candidateMemories.map((m) => m.id));

    const vectorScores = new Map<string, number>();
    for (const mem of candidateMemories) {
      const vec = candidateVectors.get(mem.id);
      if (vec) {
        vectorScores.set(mem.id, cosineSimilarity(queryVector, vec));
      }
    }

    const retrievalMs = Date.now() - startMs;

    // 4. Candidate Merge & Deduplication
    const candidateMap = new Map<string, CandidateMemoryMatch>();

    // Add FTS candidates
    for (const fts of ftsResults) {
      candidateMap.set(fts.memory.id, {
        memory: fts.memory,
        bm25Score: fts.rank,
        vectorScore: vectorScores.get(fts.memory.id) ?? 0.3
      });
    }

    // Add Vector candidates
    for (const mem of candidateMemories) {
      const vScore = vectorScores.get(mem.id) ?? 0;
      if (candidateMap.has(mem.id)) {
        candidateMap.get(mem.id)!.vectorScore = vScore;
      } else {
        candidateMap.set(mem.id, {
          memory: mem,
          bm25Score: 0.1,
          vectorScore: vScore
        });
      }
    }

    const mergedCandidates = Array.from(candidateMap.values());

    // 5. Local Reranking
    const rerankStart = Date.now();
    const rankedResults = rerankMemories(mergedCandidates, {
      query: request.query,
      projectId: request.project_id,
      targetDate: request.temporalDate
    });
    const rerankMs = Date.now() - rerankStart;

    // 6. Total database tokens estimation
    let totalChars = 0;
    for (let i = 0; i < candidateMemories.length; i++) {
      totalChars += candidateMemories[i].content.length;
    }
    const totalDbTokensEstimated = Math.max(Math.ceil(totalChars / 4), 100);

    // 7. Token budget enforcement and bounded context construction
    const recallResult = buildBoundedContext(rankedResults, {
      maxTokens,
      minScore: request.minScore,
      totalDbTokensEstimated
    });

    // If handoff exists, format and inject summary into context
    if (latestHandoff) {
      const handoffText = [
        `[Session Handoff (${latestHandoff.created_at.slice(0, 10)})]`,
        `Objective: ${latestHandoff.objective}`,
        latestHandoff.important_decisions.length > 0 ? `Decisions: ${latestHandoff.important_decisions.join('; ')}` : '',
        latestHandoff.unfinished_work.length > 0 ? `Unfinished: ${latestHandoff.unfinished_work.join('; ')}` : '',
        latestHandoff.next_actions.length > 0 ? `Next: ${latestHandoff.next_actions.join('; ')}` : ''
      ].filter(Boolean).join('\n');

      recallResult.handoff = latestHandoff;
      recallResult.context = `${handoffText}\n\n${recallResult.context}`;
      recallResult.tokenCount = estimateTokens(recallResult.context);
    }

    recallResult.metrics.retrievalMs = retrievalMs;
    recallResult.metrics.rerankMs = rerankMs;

    // Update access metadata asynchronously for selected memories
    for (const selected of recallResult.memories) {
      selected.last_accessed_at = new Date().toISOString();
      selected.access_count = (selected.access_count || 0) + 1;
      this.storage.update(selected);
    }

    metrics.recordRetrieval(
      Date.now() - startMs,
      totalDbTokensEstimated,
      recallResult.tokenCount,
      recallResult.memories.length
    );

    span.end();
    return recallResult;
  }

  public async explain(request: RecallRequest): Promise<{
    query: string;
    totalCandidates: number;
    rankedMemories: Array<{
      id: string;
      content: string;
      score: number;
      vectorScore?: number;
      bm25Score?: number;
      importanceScore?: number;
      recencyScore?: number;
      matchReasons?: string[];
      includedInContext: boolean;
    }>;
    contextTokens: number;
    maxTokens: number;
  }> {
    const filter: MemoryFilter = {
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      project_id: request.project_id,
      scope: request.scope,
      types: request.types,
      valid_at: request.temporalDate,
      statuses: ['confirmed', 'probable', 'active']
    };

    const ftsResults = this.storage.searchFts(request.query, filter, 50);
    const queryVector = await this.embeddingProvider.embed(request.query);
    const candidateMemories = this.storage.list(filter, 200);
    const candidateVectors = this.storage.getVectors(candidateMemories.map((m) => m.id));

    const vectorScores = new Map<string, number>();
    for (const mem of candidateMemories) {
      const vec = candidateVectors.get(mem.id);
      if (vec) {
        vectorScores.set(mem.id, cosineSimilarity(queryVector, vec));
      }
    }

    const candidateMap = new Map<string, CandidateMemoryMatch>();
    for (const fts of ftsResults) {
      candidateMap.set(fts.memory.id, {
        memory: fts.memory,
        bm25Score: fts.rank,
        vectorScore: vectorScores.get(fts.memory.id) ?? 0.3
      });
    }
    for (const mem of candidateMemories) {
      const vScore = vectorScores.get(mem.id) ?? 0;
      if (candidateMap.has(mem.id)) {
        candidateMap.get(mem.id)!.vectorScore = vScore;
      } else {
        candidateMap.set(mem.id, {
          memory: mem,
          bm25Score: 0.1,
          vectorScore: vScore
        });
      }
    }

    const ranked = rerankMemories(Array.from(candidateMap.values()), {
      query: request.query,
      projectId: request.project_id,
      targetDate: request.temporalDate
    });

    const recall = buildBoundedContext(ranked, {
      maxTokens: request.maxTokens || this.defaultMaxTokens,
      minScore: request.minScore
    });

    const includedIds = new Set(recall.memories.map((m) => m.id));

    return {
      query: request.query,
      totalCandidates: ranked.length,
      rankedMemories: ranked.map((r) => ({
        id: r.memory.id,
        content: r.memory.content,
        score: r.score,
        vectorScore: r.vector_score,
        bm25Score: r.bm25_score,
        importanceScore: r.importance_score,
        recencyScore: r.recency_score,
        matchReasons: r.match_reasons,
        includedInContext: includedIds.has(r.memory.id)
      })),
      contextTokens: recall.tokenCount,
      maxTokens: recall.maxTokens
    };
  }

  public async search(
    query: string,
    filter: MemoryFilter,
    limit = 20
  ): Promise<MemorySearchResult[]> {
    const ftsResults = this.storage.searchFts(query, filter, limit * 2);
    const queryVec = await this.embeddingProvider.embed(query);
    const vectors = this.storage.getVectors(ftsResults.map((r) => r.memory.id));

    const matches: CandidateMemoryMatch[] = ftsResults.map((r) => ({
      memory: r.memory,
      bm25Score: r.rank,
      vectorScore: vectors.has(r.memory.id)
        ? cosineSimilarity(queryVec, vectors.get(r.memory.id)!)
        : 0.5
    }));

    const ranked = rerankMemories(matches, {
      query,
      projectId: filter.project_id,
      targetDate: filter.valid_at
    });

    return ranked.slice(0, limit);
  }

  public async forget(id: string, context: { tenant_id: string; user_id: string }): Promise<boolean> {
    const mem = this.storage.getById(id);
    if (!mem) return false;
    if (mem.tenant_id !== context.tenant_id || mem.user_id !== context.user_id) {
      throw new Error(`Unauthorized deletion of memory ${id}`);
    }
    this.storage.delete(id);
    metrics.recordMemoryCount(this.storage.count());
    return true;
  }

  public async consolidate(context: { tenant_id: string; user_id: string }): Promise<ConsolidationResult> {
    const activeMemories = this.storage.list({
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      statuses: ['confirmed', 'probable']
    });

    const result = runMemoryConsolidation(activeMemories, context);

    // Persist new canonical memories
    for (const canonical of result.canonicalMemoriesCreated) {
      const vec = await this.embeddingProvider.embed(canonical.content);
      this.storage.insert(canonical);
      this.storage.saveVector(canonical.id, vec);
    }

    // Update archived status
    for (const archivedId of result.archivedMemoryIds) {
      const mem = this.storage.getById(archivedId);
      if (mem) {
        mem.status = 'archived';
        mem.updated_at = new Date().toISOString();
        this.storage.update(mem);
      }
    }

    return result;
  }

  public async timeline(context: { tenant_id: string; user_id: string; entity?: string }): Promise<Memory[]> {
    const filter: MemoryFilter = {
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      statuses: ['confirmed', 'probable', 'superseded', 'archived']
    };
    const all = this.storage.list(filter, 500);

    if (!context.entity) {
      return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    const filtered = all.filter(
      (m) =>
        m.entities.some((e) => e.toLowerCase() === context.entity!.toLowerCase()) ||
        m.content.toLowerCase().includes(context.entity!.toLowerCase())
    );

    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // ================= Session Handoff Operations =================
  public async createHandoff(input: CreateHandoffInput): Promise<SessionHandoff> {
    const handoff: SessionHandoff = {
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id || 'default',
      user_id: input.user_id || 'default-user',
      project_id: input.project_id,
      session_id: input.session_id || generateSecureToken(8),
      created_at: new Date().toISOString(),
      objective: input.objective,
      completed_work: input.completed_work || [],
      unfinished_work: input.unfinished_work || [],
      important_decisions: input.important_decisions || [],
      current_architecture: input.current_architecture || '',
      relevant_files: input.relevant_files || [],
      known_problems: input.known_problems || [],
      next_actions: input.next_actions || [],
      important_context: input.important_context || ''
    };

    this.storage.insertHandoff(handoff);
    logger.info({ handoffId: handoff.id, projectId: handoff.project_id }, 'Session handoff recorded');
    return handoff;
  }

  public getLatestHandoff(projectId: string, userId = 'default-user'): SessionHandoff | null {
    return this.storage.getLatestHandoff(projectId, userId);
  }

  public listHandoffs(projectId?: string, userId = 'default-user', limit = 20): SessionHandoff[] {
    return this.storage.listHandoffs(projectId, userId, limit);
  }

  // ================= Targeted Memory Sharing =================
  public async shareMemory(input: ShareMemoryInput): Promise<MemoryShareRecord> {
    const share: MemoryShareRecord = {
      id: crypto.randomUUID(),
      tenant_id: input.tenant_id || 'default',
      user_id: input.user_id || 'default-user',
      memory_id: input.memory_id || null,
      project_id: input.project_id || null,
      namespace: input.namespace || null,
      target_user_id: input.target_user_id || null,
      target_project_id: input.target_project_id || null,
      target_namespace: input.target_namespace || null,
      permissions: input.permissions || 'read',
      created_at: new Date().toISOString(),
      expires_at: input.expires_at || null
    };

    this.storage.insertShare(share);
    logger.info({ shareId: share.id }, 'Targeted memory share recorded');
    return share;
  }

  public listShares(filter: { tenant_id?: string; user_id?: string; project_id?: string } = {}): MemoryShareRecord[] {
    return this.storage.listShares(filter);
  }

  // ================= Progressive Disclosure Recall =================
  public async progressiveRecall(request: ProgressiveRecallRequest): Promise<ProgressiveRecallResult> {
    const searchResults = await this.search(request.query, {
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      project_id: request.project_id,
      scope: request.scope,
      types: request.types
    });

    let handoff: SessionHandoff | null = null;
    if (request.project_id && request.includeHandoff !== false) {
      handoff = this.storage.getLatestHandoff(request.project_id, request.user_id);
    }

    return buildProgressiveContext(searchResults, handoff, {
      maxTokens: request.maxTokens || this.defaultMaxTokens,
      minScore: request.minScore,
      targetLevel: request.targetLevel || 'canonical',
      expandReferences: request.expandReferences
    });
  }

  // ================= Event Processing =================
  public async processEvent(rawEvent: any): Promise<{ event: MemoryAIEvent; memory?: Memory }> {
    const event = eventNormalizer.normalizeRawEvent(rawEvent);
    this.storage.insertEvent(event);

    const candidate = eventNormalizer.eventToCandidate(event);
    if (!candidate) {
      return { event };
    }

    const { memory } = await this.remember(candidate, {
      tenant_id: event.tenant_id,
      user_id: event.user_id,
      project_id: event.project_id
    });

    return { event, memory };
  }

  // ================= Health & Diagnostics =================
  public getProjectHealth(projectId: string): ProjectMemoryHealth {
    return this.health.getProjectHealth(projectId);
  }

  public verifyIntegrity(): IntegrityReport {
    return this.integrity.verifyIntegrity();
  }

  public repairIntegrity(): { repairedCount: number; report: IntegrityReport } {
    return this.integrity.repair();
  }
}
