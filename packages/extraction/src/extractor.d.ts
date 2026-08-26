import { ConversationEvent, MemoryCandidate, MemoryType } from '@sachin97317/types';
export declare function extractEntitiesAndTopics(text: string): {
    entities: string[];
    topics: string[];
};
export declare function evaluateCandidateScore(candidate: {
    content: string;
    importance?: number;
    durability?: number;
    future_usefulness?: number;
    confidence?: number;
    specificity?: number;
}): {
    score: number;
    importance: number;
    durability: number;
    future_usefulness: number;
    confidence: number;
    specificity: number;
    isTransient: boolean;
};
export declare function classifyMemoryType(text: string): MemoryType;
export declare function extractMemoriesFromConversation(events: ConversationEvent[], options?: {
    minScore?: number;
    tenant_id?: string;
    user_id?: string;
    project_id?: string;
}): MemoryCandidate[];
//# sourceMappingURL=extractor.d.ts.map