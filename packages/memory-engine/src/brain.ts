import { BrainDecision, DecisionAction, Memory, MemoryCandidate } from '@memoryai/types';
import { hashContent, sanitizeMemoryContent } from '@memoryai/security';
import { evaluateCandidateScore, extractEntitiesAndTopics } from '@memoryai/extraction';
import { cosineSimilarity } from '@memoryai/embeddings';

// Contradiction / override markers
const CONFLICT_MARKERS = [
  /no longer use/i,
  /switch(ed)?\s+(from\s+.+?\s+)?to/i,
  /instead of/i,
  /deprecated/i,
  /replaced/i,
  /migration from/i,
  /migrat(ed)?\s+(from\s+.+?\s+)?to/i,
  /migrated\s+from/i,
  /moved to/i
];

// Instruction-injection patterns — content that looks like AI instruction overrides
const INJECTION_RISK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+prompt\s*:/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /new\s+system\s+instruction/i,
  /you\s+(are|must)\s+now\s+(a|an|the)\s+/i,
  /act\s+as\s+(a|an|the)\s+/i
];

export class MemoryBrain {
  public decide(
    candidate: MemoryCandidate,
    existingMemories: Memory[],
    candidateVector?: number[],
    existingVectors?: Map<string, number[]>,
    options?: { imported?: boolean }
  ): BrainDecision {
    const content = candidate.content.trim();
    const candidateHash = hashContent(content);

    // 0. Quarantine check: instruction injection or imported content with suspicious patterns
    const hasInjectionRisk = INJECTION_RISK_PATTERNS.some((re) => re.test(content));
    if (hasInjectionRisk) {
      return {
        action: 'QUARANTINE',
        confidence: 0.99,
        reason: 'Content matches prompt injection override pattern — quarantined for safety review'
      };
    }

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

    // 2. Quarantine low-confidence imported content
    if (options?.imported && (candidate.confidence ?? 1.0) < 0.5) {
      return {
        action: 'QUARANTINE',
        confidence: 0.85,
        reason: `Imported memory has low confidence (${candidate.confidence ?? 'unset'}) — quarantined pending verification`
      };
    }

    // 3. Check for exact duplicate content_hash
    const exactMatch = existingMemories.find((m) => m.content_hash === candidateHash);
    if (exactMatch) {
      if (exactMatch.status === 'active') {
        return {
          action: 'IGNORE',
          confidence: 1.0,
          reason: 'Identical memory already actively exists',
          target_memory_id: exactMatch.id
        };
      } else {
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

    // 4. Search for related memories by shared entities and semantic similarity
    const candidateEntities = candidate.entities || extractEntitiesAndTopics(content).entities;
    let highestSim = 0;
    let closestMemory: Memory | null = null;

    for (const mem of existingMemories) {
      if (mem.status === 'deleted') continue;

      let sim = 0;
      if (candidateVector && existingVectors && existingVectors.has(mem.id)) {
        const memVec = existingVectors.get(mem.id)!;
        sim = cosineSimilarity(candidateVector, memVec);
      } else {
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

    // 5. Check for explicit conflict / superseding phrases
    const isConflictPhrase = CONFLICT_MARKERS.some((re) => re.test(content));

    if (closestMemory) {
      if (isConflictPhrase && highestSim > 0.3) {
        return {
          action: 'CONFLICT',
          confidence: 0.90,
          reason: `Detected direct state transition or conflict with existing memory ${closestMemory.id}`,
          target_memory_id: closestMemory.id,
          superseded_ids: [closestMemory.id]
        };
      }

      if (highestSim > 0.75) {
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
    }

    // 6. Default: CREATE new memory record
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

