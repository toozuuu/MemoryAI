import { Memory } from '@memoryai/types';
export interface ConsolidationResult {
    consolidatedMemories: Memory[];
    archivedMemoryIds: string[];
    canonicalMemoriesCreated: Memory[];
}
export declare function clusterMemoriesByEntity(memories: Memory[]): Map<string, Memory[]>;
export declare function consolidateCluster(clusterKey: string, memories: Memory[], context: {
    tenant_id: string;
    user_id: string;
}): {
    canonical: Memory;
    supersededIds: string[];
} | null;
export declare function runMemoryConsolidation(memories: Memory[], context: {
    tenant_id: string;
    user_id: string;
}): ConsolidationResult;
//# sourceMappingURL=consolidator.d.ts.map