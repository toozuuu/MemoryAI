export type MemoryScope = 'global' | 'user' | 'project' | 'session';
export type MemoryType = 'user' | 'preference' | 'project' | 'task' | 'episodic' | 'semantic' | 'procedural' | 'decision' | 'fact' | 'relationship' | 'temporary';
export type MemoryStatus = 'candidate' | 'active' | 'confirmed' | 'superseded' | 'archived' | 'deleted';
export type MemoryPrivacyLevel = 'public' | 'internal' | 'confidential' | 'restricted';
export type DecisionAction = 'CREATE' | 'UPDATE' | 'MERGE' | 'CONFLICT' | 'IGNORE' | 'SUPERSEDE' | 'ARCHIVE';
export interface Memory {
    id: string;
    tenant_id: string;
    user_id: string;
    scope: MemoryScope;
    project_id: string | null;
    type: MemoryType;
    content: string;
    summary: string | null;
    entities: string[];
    topics: string[];
    importance: number;
    confidence: number;
    created_at: string;
    updated_at: string;
    valid_from: string | null;
    valid_to: string | null;
    last_accessed_at: string | null;
    access_count: number;
    source_provider: string | null;
    source_session_id: string | null;
    source_message_id: string | null;
    parent_memory_id: string | null;
    status: MemoryStatus;
    privacy_level: MemoryPrivacyLevel;
    content_hash: string;
    embedding_reference?: string | number[] | null;
}
export interface MemoryCandidate {
    content: string;
    summary?: string;
    type?: MemoryType;
    scope?: MemoryScope;
    project_id?: string | null;
    entities?: string[];
    topics?: string[];
    importance?: number;
    durability?: number;
    future_usefulness?: number;
    confidence?: number;
    specificity?: number;
    repetition?: number;
    source_provider?: string;
    source_session_id?: string;
    source_message_id?: string;
    privacy_level?: MemoryPrivacyLevel;
    valid_from?: string;
    valid_to?: string;
}
export interface BrainDecision {
    action: DecisionAction;
    confidence: number;
    reason: string;
    target_memory_id?: string;
    merged_content?: string;
    superseded_ids?: string[];
    suggested_memory?: Partial<Memory>;
}
export interface MemoryFilter {
    tenant_id?: string;
    user_id?: string;
    project_id?: string | null;
    scope?: MemoryScope | MemoryScope[];
    types?: MemoryType[];
    statuses?: MemoryStatus[];
    privacy_levels?: MemoryPrivacyLevel[];
    entities?: string[];
    topics?: string[];
    valid_at?: string;
    min_importance?: number;
    min_confidence?: number;
    source_provider?: string;
    created_after?: string;
    created_before?: string;
}
export interface MemorySearchResult {
    memory: Memory;
    score: number;
    bm25_score?: number;
    vector_score?: number;
    recency_score?: number;
    importance_score?: number;
    match_reasons?: string[];
}
export interface RecallRequest {
    tenant_id: string;
    user_id: string;
    query: string;
    project_id?: string | null;
    scope?: MemoryScope | MemoryScope[];
    maxTokens?: number;
    minScore?: number;
    types?: MemoryType[];
    includeSuperseded?: boolean;
    temporalDate?: string;
}
export interface RecallResult {
    context: string;
    tokenCount: number;
    maxTokens: number;
    memories: Memory[];
    scores: Record<string, number>;
    metrics: {
        retrievalMs: number;
        rerankMs: number;
        compressionMs: number;
        tokensSaved: number;
        savingsPercentage: number;
    };
}
export interface ConversationEvent {
    provider: string;
    sessionId: string;
    messageId?: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}
export interface MemoryPackManifest {
    schema_version: string;
    created_at: string;
    exported_by: string;
    tenant_id: string;
    user_id: string;
    project_id: string | null;
    memory_count: number;
    relationship_count: number;
    checksum: string;
    format_version: '1.0.0';
}
export interface MemoryPack {
    manifest: MemoryPackManifest;
    memories: Memory[];
    relationships?: Array<{
        source_id: string;
        target_id: string;
        type: string;
        metadata?: Record<string, unknown>;
    }>;
    sources?: Record<string, unknown>;
}
//# sourceMappingURL=memory.d.ts.map