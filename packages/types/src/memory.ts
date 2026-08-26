export type MemoryScope = 'global' | 'user' | 'organization' | 'project' | 'task' | 'session' | 'temporary';

export type MemoryType =
  | 'user'
  | 'preference'
  | 'project'
  | 'task'
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'decision'
  | 'fact'
  | 'relationship'
  | 'temporary';

export type MemoryStatus =
  | 'candidate'
  | 'active'
  | 'probable'
  | 'confirmed'
  | 'uncertain'
  | 'conflicted'
  | 'superseded'
  | 'archived'
  | 'quarantined'
  | 'deleted';

export type VerificationState = 'unverified' | 'verified' | 'disputed' | 'quarantined';

export type MemoryPrivacyLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted';

export type DecisionAction =
  | 'CREATE'
  | 'UPDATE'
  | 'MERGE'
  | 'CONFLICT'
  | 'IGNORE'
  | 'SUPERSEDE'
  | 'ARCHIVE'
  | 'QUARANTINE';

export interface Memory {
  id: string;
  tenant_id: string;
  organization_id?: string | null;
  user_id: string;
  scope: MemoryScope;
  project_id: string | null;
  namespace?: string | null;
  type: MemoryType;
  content: string;
  summary: string | null;
  entities: string[];
  topics: string[];
  importance: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  durability?: number; // 0.0 to 1.0
  freshness?: number; // 0.0 to 1.0
  source_count?: number;
  verification_state?: VerificationState;
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
  valid_from: string | null; // Temporal start
  valid_to: string | null; // Temporal end
  last_accessed_at: string | null;
  access_count: number;
  source_provider: string | null;
  source_client?: string | null;
  source_session_id: string | null;
  source_message_id: string | null;
  source_references?: string[];
  update_reason?: string | null;
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
  freshness?: number;
  future_usefulness?: number;
  confidence?: number;
  specificity?: number;
  repetition?: number;
  source_provider?: string;
  source_client?: string;
  source_session_id?: string;
  source_message_id?: string;
  source_references?: string[];
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
  organization_id?: string;
  user_id?: string;
  project_id?: string | null;
  namespace?: string | null;
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
  source_client?: string;
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
  includeHandoff?: boolean;
  temporalDate?: string;
}

export interface RecallResult {
  context: string;
  tokenCount: number;
  maxTokens: number;
  memories: Memory[];
  handoff?: SessionHandoff | null;
  scores: Record<string, number>;
  metrics: {
    retrievalMs: number;
    rerankMs: number;
    compressionMs: number;
    tokensSaved: number;
    savingsPercentage: number;
  };
}

export interface MemoryAIConversationEvent {
  provider: string;
  client: string;
  sessionId: string;
  projectId?: string;
  userId?: string;
  messageId?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ConversationEvent = MemoryAIConversationEvent;

export interface SessionHandoff {
  id: string;
  tenant_id: string;
  user_id: string;
  project_id: string;
  session_id: string;
  created_at: string;
  objective: string;
  completed_work: string[];
  unfinished_work: string[];
  important_decisions: string[];
  current_architecture: string;
  relevant_files: string[];
  known_problems: string[];
  next_actions: string[];
  important_context: string;
}

export interface CreateHandoffInput {
  tenant_id?: string;
  user_id?: string;
  project_id: string;
  session_id?: string;
  objective: string;
  completed_work?: string[];
  unfinished_work?: string[];
  important_decisions?: string[];
  current_architecture?: string;
  relevant_files?: string[];
  known_problems?: string[];
  next_actions?: string[];
  important_context?: string;
}

export interface MemoryShareRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  memory_id?: string | null;
  project_id?: string | null;
  namespace?: string | null;
  target_user_id?: string | null;
  target_project_id?: string | null;
  target_namespace?: string | null;
  permissions: 'read' | 'write';
  created_at: string;
  expires_at?: string | null;
}

export interface ShareMemoryInput {
  tenant_id?: string;
  user_id?: string;
  memory_id?: string;
  project_id?: string;
  namespace?: string;
  target_user_id?: string;
  target_project_id?: string;
  target_namespace?: string;
  permissions?: 'read' | 'write';
  expires_at?: string;
}

export interface EmbeddingMetadata {
  model: string;
  version: string;
  dimensions: number;
  distance_metric: 'cosine' | 'dot' | 'euclidean';
  created_at: string;
  vector_count: number;
  status: 'active' | 'migrating' | 'deprecated';
}

export interface MemoryPackManifest {
  schema_version: string;
  created_at: string;
  exported_by: string;
  tenant_id: string;
  user_id: string;
  project_id: string | null;
  memory_count: number;
  handoff_count?: number;
  relationship_count: number;
  checksum: string;
  format_version: '1.0.0' | '1.1.0';
}

export interface MemoryPack {
  manifest: MemoryPackManifest;
  memories: Memory[];
  handoffs?: SessionHandoff[];
  relationships?: Array<{
    source_id: string;
    target_id: string;
    type: string;
    metadata?: Record<string, unknown>;
  }>;
  sources?: Record<string, unknown>;
}

// ================= Event-Driven Memory =================
export type MemoryEventType =
  | 'session.started'
  | 'session.ended'
  | 'message.created'
  | 'task.started'
  | 'task.completed'
  | 'task.blocked'
  | 'file.changed'
  | 'architecture.changed'
  | 'decision.created'
  | 'project.updated'
  | 'dependency.changed'
  | 'error.detected'
  | 'handoff.created'
  | 'memory.created'
  | 'memory.updated'
  | 'memory.superseded'
  | 'memory.conflicted';

export type EventPolicyAction = 'ignore' | 'observe' | 'capture' | 'review' | 'immediate';

export interface MemoryAIEvent {
  id: string;
  type: MemoryEventType;
  tenant_id: string;
  user_id: string;
  project_id?: string | null;
  namespace?: string | null;
  client_id?: string | null;
  agent_id?: string | null;
  data: Record<string, unknown>;
  timestamp: string; // ISO-8601
  importance: number; // 0.0 to 1.0
  policy_action?: EventPolicyAction;
}

// ================= Long-Running Tasks (MCP 2026 Tasks Extension) =================
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface MemoryTask {
  id: string;
  tenant_id: string;
  user_id: string;
  project_id?: string | null;
  type: 'embedding_rebuild' | 'embedding_migration' | 'consolidation' | 'reindex' | 'import_pack' | 'export_pack' | 'integrity_verify' | 'integrity_repair' | 'custom';
  name: string;
  status: TaskStatus;
  progress: number; // 0 to 100
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

// ================= Reference-Based & Progressive Disclosure Context =================
export type ProgressiveDisclosureLevel = 'summary' | 'canonical' | 'evidence' | 'conversation';

export interface MemoryReference {
  reference_id: string;
  target_type: 'memory' | 'document' | 'session' | 'handoff' | 'artifact' | 'conversation';
  target_id: string;
  summary: string;
  relevance_score: number;
  deep_fetch_handle: string;
}

export interface ProgressiveRecallRequest extends RecallRequest {
  targetLevel?: ProgressiveDisclosureLevel;
  expandReferences?: boolean;
}

export interface ProgressiveRecallResult extends RecallResult {
  level: ProgressiveDisclosureLevel;
  references: MemoryReference[];
  escalationRecommended: boolean;
  nextLevel?: ProgressiveDisclosureLevel;
}

// ================= Memory Snapshots & Versioning =================
export interface MemoryVersion {
  id: string;
  memory_id: string;
  version_number: number;
  content: string;
  summary: string | null;
  importance: number;
  confidence: number;
  entities: string[];
  topics: string[];
  changed_by: string;
  change_reason: string;
  source_evidence?: string | null;
  created_at: string;
}

export interface MemorySnapshot {
  id: string;
  tenant_id: string;
  user_id: string;
  project_id: string;
  name: string;
  description: string;
  memory_count: number;
  state_checksum: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryDiff {
  memory_id: string;
  from_version: number;
  to_version: number;
  content_changed: boolean;
  old_content: string;
  new_content: string;
  changed_fields: string[];
  reason: string;
  timestamp: string;
}

// ================= Project Health & Integrity Engine =================
export interface ProjectMemoryHealth {
  project_id: string;
  overall_score: number; // 0 to 100
  components: {
    freshness_score: number; // 0 to 100
    confidence_score: number; // 0 to 100
    conflict_free_score: number; // 0 to 100
    provenance_score: number; // 0 to 100
    handoff_completeness_score: number; // 0 to 100
  };
  metrics: {
    total_memories: number;
    active_conflicts: number;
    stale_memories: number;
    quarantined_memories: number;
    duplicate_candidates: number;
  };
  diagnostic_summary: string[];
}

export interface IntegrityReport {
  timestamp: string;
  status: 'healthy' | 'warning' | 'corrupted';
  orphaned_vectors: number;
  broken_provenance_links: number;
  duplicate_hashes: number;
  invalid_scopes: number;
  repaired_count: number;
  details: string[];
}

// ================= Conflict Center & Review Queue =================
export interface MemoryConflictRecord {
  id: string;
  tenant_id: string;
  project_id: string;
  topic: string;
  source_a: {
    memory_id: string;
    content: string;
    confidence: number;
    source: string;
    date: string;
  };
  source_b: {
    memory_id: string;
    content: string;
    confidence: number;
    source: string;
    date: string;
  };
  status: 'unresolved' | 'resolved' | 'ignored';
  resolution?: string;
  resolved_at?: string;
}

export type ReviewRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryReviewItem {
  id: string;
  tenant_id: string;
  user_id: string;
  project_id?: string | null;
  candidate_content: string;
  candidate_type: MemoryType;
  reason: string;
  risk_level: ReviewRiskLevel;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// ================= Policies, Privacy & Agent Identity =================
export type PrivacyCategory =
  | 'credentials'
  | 'auth_secrets'
  | 'private_identifiers'
  | 'financial'
  | 'pii'
  | 'safe';

export interface PrivacyClassificationResult {
  category: PrivacyCategory;
  confidence: number;
  action: 'reject' | 'redact' | 'encrypt' | 'quarantine' | 'store';
  redacted_content?: string;
  flagged_patterns: string[];
}

export interface AgentIdentity {
  agent_id: string;
  agent_type: string; // e.g. 'claude-code', 'cursor', 'codex', 'gemini-cli'
  client_id: string;
  organization_id?: string | null;
  user_id: string;
  project_id?: string | null;
  capabilities: string[]; // e.g. ['memory.read', 'memory.write', 'memory.export']
}

export interface MemoryDelegation {
  id: string;
  tenant_id: string;
  delegator_user_id: string;
  target_agent_id: string;
  project_id: string;
  namespace?: string | null;
  permissions: string[];
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

export interface SyncQueueItem {
  id: string;
  tenant_id: string;
  entity_type: 'memory' | 'handoff' | 'snapshot';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  version: number;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'acknowledged' | 'conflicted' | 'failed';
  attempts: number;
  created_at: string;
}

export type ModelRoutingMode = 'local_only' | 'cost_optimized' | 'quality_optimized' | 'privacy_optimized';

export interface ModelRoutingConfig {
  mode: ModelRoutingMode;
  local_embedding_model: string;
  local_reranker_model?: string;
  cloud_fallback_enabled: boolean;
}

export interface SimulationRun {
  id: string;
  policy_name: string;
  queries_evaluated: number;
  mrr: number;
  precision_at_k: number;
  recall_at_k: number;
  tokens_saved: number;
  latency_ms: number;
  created_at: string;
}

