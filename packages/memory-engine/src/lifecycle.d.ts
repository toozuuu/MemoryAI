import { Memory, MemoryCandidate } from '@memoryai/types';
export declare function createMemoryFromCandidate(candidate: MemoryCandidate, context: {
    tenant_id: string;
    user_id: string;
    project_id?: string | null;
}): Memory;
export declare function handleTemporalConflict(existingMemory: Memory, newCandidate: MemoryCandidate, context: {
    tenant_id: string;
    user_id: string;
    project_id?: string | null;
}): {
    supersededMemory: Memory;
    newMemory: Memory;
};
//# sourceMappingURL=lifecycle.d.ts.map