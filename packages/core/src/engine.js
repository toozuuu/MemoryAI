import { SqliteMemoryStorage } from '@sachin97317/storage-sqlite';
import { getEmbeddingProvider, cosineSimilarity } from '@sachin97317/embeddings';
import { memoryBrain } from '@sachin97317/memory-engine';
import { createMemoryFromCandidate, handleTemporalConflict } from '@sachin97317/memory-engine';
import { rerankMemories } from '@sachin97317/reranking';
import { buildBoundedContext, estimateTokens } from '@sachin97317/context-builder';
import { runMemoryConsolidation } from '@sachin97317/consolidation';
import { logger, metrics, tracer } from '@sachin97317/observability';
import { hashContent } from '@sachin97317/security';
export class MemoryEngine {
    storage;
    embeddingProvider;
    defaultMaxTokens;
    constructor(config = {}) {
        this.storage = config.storage || new SqliteMemoryStorage();
        this.embeddingProvider = config.embeddingProvider || getEmbeddingProvider();
        this.defaultMaxTokens = config.defaultMaxTokens || 1000;
    }
    async remember(candidate, context) {
        const span = tracer.startSpan('memory.remember');
        const startMs = Date.now();
        // 1. Fetch active memories for this tenant & user
        const existing = this.storage.list({
            tenant_id: context.tenant_id,
            user_id: context.user_id,
            statuses: ['active', 'confirmed', 'superseded']
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
        let resultingMemory;
        switch (decision.action) {
            case 'IGNORE':
                break;
            case 'CREATE': {
                resultingMemory = createMemoryFromCandidate(candidate, context);
                this.storage.insert(resultingMemory);
                this.storage.saveVector(resultingMemory.id, candidateVector);
                break;
            }
            case 'CONFLICT': {
                const targetId = decision.target_memory_id;
                const targetMem = this.storage.getById(targetId);
                if (targetMem) {
                    const { supersededMemory, newMemory } = handleTemporalConflict(targetMem, candidate, context);
                    this.storage.update(supersededMemory);
                    this.storage.insert(newMemory);
                    this.storage.saveVector(newMemory.id, candidateVector);
                    resultingMemory = newMemory;
                }
                else {
                    resultingMemory = createMemoryFromCandidate(candidate, context);
                    this.storage.insert(resultingMemory);
                    this.storage.saveVector(resultingMemory.id, candidateVector);
                }
                break;
            }
            case 'UPDATE': {
                const targetId = decision.target_memory_id;
                const targetMem = this.storage.getById(targetId);
                if (targetMem) {
                    const updated = {
                        ...targetMem,
                        ...decision.suggested_memory,
                        updated_at: new Date().toISOString()
                    };
                    this.storage.update(updated);
                    this.storage.saveVector(updated.id, candidateVector);
                    resultingMemory = updated;
                }
                break;
            }
            case 'MERGE': {
                const targetId = decision.target_memory_id;
                const targetMem = this.storage.getById(targetId);
                if (targetMem && decision.merged_content) {
                    const mergedVec = await this.embeddingProvider.embed(decision.merged_content);
                    const updated = {
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
                const targetId = decision.target_memory_id;
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
                const targetId = decision.target_memory_id;
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
    async recall(request) {
        const span = tracer.startSpan('memory.recall');
        const startMs = Date.now();
        const maxTokens = request.maxTokens || this.defaultMaxTokens;
        const filter = {
            tenant_id: request.tenant_id,
            user_id: request.user_id,
            project_id: request.project_id,
            scope: request.scope,
            types: request.types,
            valid_at: request.temporalDate,
            statuses: request.includeSuperseded ? ['active', 'confirmed', 'superseded'] : ['active', 'confirmed']
        };
        // 1. FTS search
        const ftsResults = this.storage.searchFts(request.query, filter, 50);
        // 2. Vector search
        const queryVector = await this.embeddingProvider.embed(request.query);
        const candidateMemories = this.storage.list(filter, 200);
        const candidateVectors = this.storage.getVectors(candidateMemories.map((m) => m.id));
        const vectorScores = new Map();
        for (const mem of candidateMemories) {
            const vec = candidateVectors.get(mem.id);
            if (vec) {
                vectorScores.set(mem.id, cosineSimilarity(queryVector, vec));
            }
        }
        const retrievalMs = Date.now() - startMs;
        // 3. Candidate Merge & Deduplication
        const candidateMap = new Map();
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
                candidateMap.get(mem.id).vectorScore = vScore;
            }
            else if (vScore > 0.45) {
                candidateMap.set(mem.id, {
                    memory: mem,
                    bm25Score: 0.2,
                    vectorScore: vScore
                });
            }
        }
        const mergedCandidates = Array.from(candidateMap.values());
        // 4. Local Reranking
        const rerankStart = Date.now();
        const rankedResults = rerankMemories(mergedCandidates, {
            query: request.query,
            projectId: request.project_id,
            targetDate: request.temporalDate
        });
        const rerankMs = Date.now() - rerankStart;
        // 5. Total database tokens estimation
        const allDbContent = candidateMemories.map((m) => m.content).join('\n');
        const totalDbTokensEstimated = Math.max(estimateTokens(allDbContent), 100);
        // 6. Token budget enforcement and bounded context construction
        const recallResult = buildBoundedContext(rankedResults, {
            maxTokens,
            totalDbTokensEstimated
        });
        recallResult.metrics.retrievalMs = retrievalMs;
        recallResult.metrics.rerankMs = rerankMs;
        // Update access metadata asynchronously for selected memories
        for (const selected of recallResult.memories) {
            selected.last_accessed_at = new Date().toISOString();
            selected.access_count = (selected.access_count || 0) + 1;
            this.storage.update(selected);
        }
        metrics.recordRetrieval(Date.now() - startMs, totalDbTokensEstimated, recallResult.tokenCount);
        span.end();
        return recallResult;
    }
    async search(query, filter, limit = 20) {
        const ftsResults = this.storage.searchFts(query, filter, limit * 2);
        const queryVec = await this.embeddingProvider.embed(query);
        const vectors = this.storage.getVectors(ftsResults.map((r) => r.memory.id));
        const matches = ftsResults.map((r) => ({
            memory: r.memory,
            bm25Score: r.rank,
            vectorScore: vectors.has(r.memory.id)
                ? cosineSimilarity(queryVec, vectors.get(r.memory.id))
                : 0.5
        }));
        const ranked = rerankMemories(matches, {
            query,
            projectId: filter.project_id,
            targetDate: filter.valid_at
        });
        return ranked.slice(0, limit);
    }
    async forget(id, context) {
        const mem = this.storage.getById(id);
        if (!mem)
            return false;
        if (mem.tenant_id !== context.tenant_id || mem.user_id !== context.user_id) {
            throw new Error(`Unauthorized deletion of memory ${id}`);
        }
        this.storage.delete(id);
        metrics.recordMemoryCount(this.storage.count());
        return true;
    }
    async consolidate(context) {
        const activeMemories = this.storage.list({
            tenant_id: context.tenant_id,
            user_id: context.user_id,
            statuses: ['active']
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
    async timeline(context) {
        const filter = {
            tenant_id: context.tenant_id,
            user_id: context.user_id,
            statuses: ['active', 'confirmed', 'superseded', 'archived']
        };
        const all = this.storage.list(filter, 500);
        if (!context.entity) {
            return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        const filtered = all.filter((m) => m.entities.some((e) => e.toLowerCase() === context.entity.toLowerCase()) ||
            m.content.toLowerCase().includes(context.entity.toLowerCase()));
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
}
//# sourceMappingURL=engine.js.map