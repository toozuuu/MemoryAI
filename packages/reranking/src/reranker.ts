import { Memory, MemorySearchResult } from '@memoryai/types';

export interface RerankingWeights {
  vectorWeight: number;
  bm25Weight: number;
  importanceWeight: number;
  confidenceWeight: number;
  recencyWeight: number;
  temporalValidityWeight: number;
  projectBonus: number;
  accessBonus: number;
}

export const DEFAULT_RERANKING_WEIGHTS: RerankingWeights = {
  vectorWeight: 0.35,
  bm25Weight: 0.25,
  importanceWeight: 0.15,
  confidenceWeight: 0.05,
  recencyWeight: 0.10,
  temporalValidityWeight: 0.10,
  projectBonus: 0.10,
  accessBonus: 0.05
};

export interface CandidateMemoryMatch {
  memory: Memory;
  bm25Score?: number; // 0..1
  vectorScore?: number; // 0..1
}

export function computeRecencyScore(createdAtIso: string, halfLifeDays = 30): number {
  const ageMs = Date.now() - new Date(createdAtIso).getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  // Exponential decay
  return Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
}

export function computeTemporalValidityScore(memory: Memory, targetDateIso?: string): number {
  const targetTime = targetDateIso ? new Date(targetDateIso).getTime() : Date.now();
  const validFrom = memory.valid_from ? new Date(memory.valid_from).getTime() : null;
  const validTo = memory.valid_to ? new Date(memory.valid_to).getTime() : null;

  // If memory is active within target time
  if (validFrom && targetTime < validFrom) {
    return 0.1; // Future memory relative to target date
  }
  if (validTo && targetTime > validTo) {
    return 0.2; // Historical/superseded memory
  }

  // Active current memory
  return 1.0;
}

export function computeAccessScore(accessCount: number): number {
  return Math.min(1.0, Math.log1p(accessCount) / Math.log1p(50));
}

export function rerankMemories(
  candidates: CandidateMemoryMatch[],
  options?: {
    query?: string;
    projectId?: string | null;
    targetDate?: string;
    weights?: Partial<RerankingWeights>;
  }
): MemorySearchResult[] {
  const weights = { ...DEFAULT_RERANKING_WEIGHTS, ...options?.weights };
  const targetDate = options?.targetDate;
  const targetProjectId = options?.projectId;

  const scoredResults: MemorySearchResult[] = candidates.map((cand) => {
    const mem = cand.memory;
    const reasons: string[] = [];

    const vScore = cand.vectorScore ?? 0.5;
    const bScore = cand.bm25Score ?? 0.5;
    const impScore = mem.importance ?? 0.5;
    const confScore = mem.confidence ?? 1.0;
    const recScore = computeRecencyScore(mem.updated_at || mem.created_at);
    const tempScore = computeTemporalValidityScore(mem, targetDate);
    const accScore = computeAccessScore(mem.access_count || 0);

    let finalScore =
      vScore * weights.vectorWeight +
      bScore * weights.bm25Weight +
      impScore * weights.importanceWeight +
      confScore * weights.confidenceWeight +
      recScore * weights.recencyWeight +
      tempScore * weights.temporalValidityWeight +
      accScore * weights.accessBonus;

    if (vScore > 0.7) reasons.push(`High semantic similarity (${(vScore * 100).toFixed(0)}%)`);
    if (bScore > 0.7) reasons.push(`Exact keyword match`);
    if (impScore >= 0.8) reasons.push(`High priority memory`);

    // Project matching bonus
    if (targetProjectId && mem.project_id === targetProjectId) {
      finalScore += weights.projectBonus;
      reasons.push(`Direct project match (${targetProjectId})`);
    }

    // Penalize superseded or archived memories if not explicitly targeted
    if (mem.status === 'superseded') {
      finalScore *= 0.4;
      reasons.push(`Superseded historical fact`);
    } else if (mem.status === 'archived') {
      finalScore *= 0.3;
      reasons.push(`Archived memory`);
    }

    return {
      memory: mem,
      score: Math.min(1.0, Math.max(0.0, finalScore)),
      vector_score: vScore,
      bm25_score: bScore,
      recency_score: recScore,
      importance_score: impScore,
      match_reasons: reasons
    };
  });

  // Sort descending by final score
  return scoredResults.sort((a, b) => b.score - a.score);
}
