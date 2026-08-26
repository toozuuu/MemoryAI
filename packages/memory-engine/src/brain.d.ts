import { BrainDecision, Memory, MemoryCandidate } from '@sachin97317/types';
export declare class MemoryBrain {
    decide(candidate: MemoryCandidate, existingMemories: Memory[], candidateVector?: number[], existingVectors?: Map<string, number[]>): BrainDecision;
}
export declare const memoryBrain: MemoryBrain;
//# sourceMappingURL=brain.d.ts.map