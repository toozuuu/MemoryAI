import { Memory, MemorySearchResult } from '@sachin97317/types';
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
export declare const DEFAULT_RERANKING_WEIGHTS: RerankingWeights;
export interface CandidateMemoryMatch {
    memory: Memory;
    bm25Score?: number;
    vectorScore?: number;
}
export declare function computeRecencyScore(createdAtIso: string, halfLifeDays?: number): number;
export declare function computeTemporalValidityScore(memory: Memory, targetDateIso?: string): number;
export declare function computeAccessScore(accessCount: number): number;
export declare function rerankMemories(candidates: CandidateMemoryMatch[], options?: {
    query?: string;
    projectId?: string | null;
    targetDate?: string;
    weights?: Partial<RerankingWeights>;
}): MemorySearchResult[];
//# sourceMappingURL=reranker.d.ts.map