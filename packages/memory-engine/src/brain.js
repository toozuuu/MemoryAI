import { hashContent } from '@sachin97317/security';
import { evaluateCandidateScore, extractEntitiesAndTopics } from '@sachin97317/extraction';
import { cosineSimilarity } from '@sachin97317/embeddings';
// Contradiction / override markers
const CONFLICT_MARKERS = [
    /no longer use/i,
    /switch(ed)? from/i,
    /instead of/i,
    /deprecated/i,
    /replaced/i,
    /migration from/i,
    /moved to/i
];
export class MemoryBrain {
    decide(candidate, existingMemories, candidateVector, existingVectors) {
        const content = candidate.content.trim();
        const candidateHash = hashContent(content);
        // 1. Check transient / noise candidate score
        const scoreEval = evaluateCandidateScore({
            content,
            importance: candidate.importance,
            durability: candidate.durability,
            future_usefulness: candidate.future_usefulness,
            confidence: candidate.confidence,
            specificity: candidate.specificity
        });
        if (scoreEval.isTransient || scoreEval.score < 0.35) {
            return {
                action: 'IGNORE',
                confidence: 0.95,
                reason: 'Candidate content is ephemeral or transient conversational noise'
            };
        }
        // 2. Check for exact duplicate content_hash
        const exactMatch = existingMemories.find((m) => m.content_hash === candidateHash);
        if (exactMatch) {
            if (exactMatch.status === 'active') {
                return {
                    action: 'IGNORE',
                    confidence: 1.0,
                    reason: 'Identical memory already actively exists',
                    target_memory_id: exactMatch.id
                };
            }
            else {
                // Reactivate archived/superseded memory if identical
                return {
                    action: 'UPDATE',
                    confidence: 0.95,
                    reason: 'Reactivating existing memory with fresh timestamp',
                    target_memory_id: exactMatch.id,
                    suggested_memory: {
                        status: 'active',
                        updated_at: new Date().toISOString()
                    }
                };
            }
        }
        // 3. Search for related memories by shared entities and semantic similarity
        const candidateEntities = candidate.entities || extractEntitiesAndTopics(content).entities;
        let highestSim = 0;
        let closestMemory = null;
        for (const mem of existingMemories) {
            if (mem.status === 'deleted')
                continue;
            let sim = 0;
            if (candidateVector && existingVectors && existingVectors.has(mem.id)) {
                const memVec = existingVectors.get(mem.id);
                sim = cosineSimilarity(candidateVector, memVec);
            }
            else {
                // Fallback entity overlap Jaccard
                const shared = mem.entities.filter((e) => candidateEntities.includes(e));
                if (shared.length > 0) {
                    sim = shared.length / Math.max(1, mem.entities.length + candidateEntities.length - shared.length);
                }
            }
            if (sim > highestSim) {
                highestSim = sim;
                closestMemory = mem;
            }
        }
        // 4. Check for explicit conflict / superseding phrases
        const isConflictPhrase = CONFLICT_MARKERS.some((re) => re.test(content));
        if (closestMemory && highestSim > 0.75) {
            if (isConflictPhrase) {
                return {
                    action: 'CONFLICT',
                    confidence: 0.90,
                    reason: `Detected direct state transition or conflict with existing memory ${closestMemory.id}`,
                    target_memory_id: closestMemory.id,
                    superseded_ids: [closestMemory.id]
                };
            }
            // Check if candidate adds supplementary information (MERGE)
            if (content.length > closestMemory.content.length && content.includes(closestMemory.content)) {
                return {
                    action: 'UPDATE',
                    confidence: 0.85,
                    reason: `Candidate expands existing memory ${closestMemory.id}`,
                    target_memory_id: closestMemory.id,
                    suggested_memory: {
                        content,
                        updated_at: new Date().toISOString(),
                        importance: Math.max(closestMemory.importance, scoreEval.importance)
                    }
                };
            }
            // Very high similarity -> MERGE
            if (highestSim > 0.88) {
                const mergedContent = `${closestMemory.content}; ${content}`;
                return {
                    action: 'MERGE',
                    confidence: 0.80,
                    reason: `High semantic overlap with memory ${closestMemory.id}`,
                    target_memory_id: closestMemory.id,
                    merged_content: mergedContent
                };
            }
        }
        // 5. Default: CREATE new memory record
        return {
            action: 'CREATE',
            confidence: 0.90,
            reason: 'New unique durable knowledge',
            suggested_memory: {
                importance: scoreEval.importance,
                confidence: scoreEval.confidence
            }
        };
    }
}
export const memoryBrain = new MemoryBrain();
//# sourceMappingURL=brain.js.map