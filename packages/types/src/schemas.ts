import { z } from 'zod';

export const MemoryScopeSchema = z.enum([
  'global',
  'user',
  'organization',
  'project',
  'task',
  'session',
  'temporary'
]);

export const MemoryTypeSchema = z.enum([
  'user',
  'preference',
  'project',
  'task',
  'episodic',
  'semantic',
  'procedural',
  'decision',
  'fact',
  'relationship',
  'temporary'
]);

export const MemoryStatusSchema = z.enum([
  'candidate',
  'active',
  'probable',
  'confirmed',
  'uncertain',
  'conflicted',
  'superseded',
  'archived',
  'deleted'
]);

export const VerificationStateSchema = z.enum(['unverified', 'verified', 'disputed']);

export const MemoryPrivacyLevelSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted'
]);

export const DecisionActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'MERGE',
  'CONFLICT',
  'IGNORE',
  'SUPERSEDE',
  'ARCHIVE'
]);

export const MemorySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  scope: MemoryScopeSchema,
  project_id: z.string().nullable().optional(),
  type: MemoryTypeSchema,
  content: z.string().min(1).max(65536),
  summary: z.string().nullable().optional(),
  entities: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  importance: z.number().min(0).max(1).default(0.5),
  confidence: z.number().min(0).max(1).default(1.0),
  durability: z.number().min(0).max(1).optional(),
  freshness: z.number().min(0).max(1).optional(),
  source_count: z.number().int().nonnegative().optional(),
  verification_state: VerificationStateSchema.optional().default('unverified'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_to: z.string().datetime().nullable().optional(),
  last_accessed_at: z.string().datetime().nullable().optional(),
  access_count: z.number().int().nonnegative().default(0),
  source_provider: z.string().nullable().optional(),
  source_client: z.string().nullable().optional(),
  source_session_id: z.string().nullable().optional(),
  source_message_id: z.string().nullable().optional(),
  source_references: z.array(z.string()).optional(),
  update_reason: z.string().nullable().optional(),
  parent_memory_id: z.string().nullable().optional(),
  status: MemoryStatusSchema.default('confirmed'),
  privacy_level: MemoryPrivacyLevelSchema.default('internal'),
  content_hash: z.string().min(16),
  embedding_reference: z.any().optional()
});

export const CreateMemoryInputSchema = z.object({
  tenant_id: z.string().min(1).optional().default('default'),
  user_id: z.string().min(1),
  scope: MemoryScopeSchema.optional().default('user'),
  project_id: z.string().nullable().optional(),
  type: MemoryTypeSchema.optional().default('semantic'),
  content: z.string().min(1).max(65536),
  summary: z.string().optional(),
  entities: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  importance: z.number().min(0).max(1).optional().default(0.5),
  confidence: z.number().min(0).max(1).optional().default(1.0),
  durability: z.number().min(0).max(1).optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),
  source_provider: z.string().optional(),
  source_client: z.string().optional(),
  source_session_id: z.string().optional(),
  source_message_id: z.string().optional(),
  source_references: z.array(z.string()).optional(),
  privacy_level: MemoryPrivacyLevelSchema.optional().default('internal')
});

export const UpdateMemoryInputSchema = z.object({
  content: z.string().min(1).max(65536).optional(),
  summary: z.string().optional(),
  type: MemoryTypeSchema.optional(),
  status: MemoryStatusSchema.optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  entities: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  valid_from: z.string().datetime().nullable().optional(),
  valid_to: z.string().datetime().nullable().optional(),
  privacy_level: MemoryPrivacyLevelSchema.optional(),
  verification_state: VerificationStateSchema.optional(),
  update_reason: z.string().optional()
});

export const RecallRequestSchema = z.object({
  tenant_id: z.string().min(1).optional().default('default'),
  user_id: z.string().min(1),
  query: z.string().min(1).max(8192),
  project_id: z.string().nullable().optional(),
  scope: z.union([MemoryScopeSchema, z.array(MemoryScopeSchema)]).optional(),
  maxTokens: z.number().int().min(50).max(32000).optional().default(1000),
  minScore: z.number().min(0).max(1).optional().default(0.2),
  types: z.array(MemoryTypeSchema).optional(),
  includeSuperseded: z.boolean().optional().default(false),
  includeHandoff: z.boolean().optional().default(true),
  temporalDate: z.string().datetime().optional()
});

export const SearchQuerySchema = z.object({
  tenant_id: z.string().min(1).optional().default('default'),
  user_id: z.string().min(1).optional(),
  project_id: z.string().nullable().optional(),
  query: z.string().min(1),
  scope: MemoryScopeSchema.optional(),
  type: MemoryTypeSchema.optional(),
  status: MemoryStatusSchema.optional(),
  limit: z.number().int().min(1).max(200).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  valid_at: z.string().datetime().optional()
});

export const SessionHandoffSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  project_id: z.string().min(1),
  session_id: z.string().min(1),
  created_at: z.string().datetime(),
  objective: z.string().min(1),
  completed_work: z.array(z.string()).default([]),
  unfinished_work: z.array(z.string()).default([]),
  important_decisions: z.array(z.string()).default([]),
  current_architecture: z.string().default(''),
  relevant_files: z.array(z.string()).default([]),
  known_problems: z.array(z.string()).default([]),
  next_actions: z.array(z.string()).default([]),
  important_context: z.string().default('')
});

export const CreateHandoffInputSchema = z.object({
  tenant_id: z.string().optional().default('default'),
  user_id: z.string().optional().default('default-user'),
  project_id: z.string().min(1),
  session_id: z.string().optional(),
  objective: z.string().min(1),
  completed_work: z.array(z.string()).optional().default([]),
  unfinished_work: z.array(z.string()).optional().default([]),
  important_decisions: z.array(z.string()).optional().default([]),
  current_architecture: z.string().optional().default(''),
  relevant_files: z.array(z.string()).optional().default([]),
  known_problems: z.array(z.string()).optional().default([]),
  next_actions: z.array(z.string()).optional().default([]),
  important_context: z.string().optional().default('')
});

export const MemoryShareSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  memory_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  namespace: z.string().nullable().optional(),
  target_user_id: z.string().nullable().optional(),
  target_project_id: z.string().nullable().optional(),
  target_namespace: z.string().nullable().optional(),
  permissions: z.enum(['read', 'write']).default('read'),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable().optional()
});

export const EmbeddingMetadataSchema = z.object({
  model: z.string().min(1),
  version: z.string().min(1),
  dimensions: z.number().int().positive(),
  distance_metric: z.enum(['cosine', 'dot', 'euclidean']),
  created_at: z.string().datetime(),
  vector_count: z.number().int().nonnegative(),
  status: z.enum(['active', 'migrating', 'deprecated'])
});

export const MemoryAIConversationEventSchema = z.object({
  provider: z.string().min(1),
  client: z.string().min(1),
  sessionId: z.string().min(1),
  projectId: z.string().optional(),
  userId: z.string().optional(),
  messageId: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export const MemoryPackManifestSchema = z.object({
  schema_version: z.string(),
  created_at: z.string().datetime(),
  exported_by: z.string(),
  tenant_id: z.string(),
  user_id: z.string(),
  project_id: z.string().nullable(),
  memory_count: z.number().int().nonnegative(),
  handoff_count: z.number().int().nonnegative().optional(),
  relationship_count: z.number().int().nonnegative(),
  checksum: z.string(),
  format_version: z.enum(['1.0.0', '1.1.0'])
});

export const MemoryEventTypeSchema = z.enum([
  'session.started',
  'session.ended',
  'message.created',
  'task.started',
  'task.completed',
  'task.blocked',
  'file.changed',
  'architecture.changed',
  'decision.created',
  'project.updated',
  'dependency.changed',
  'error.detected',
  'handoff.created',
  'memory.created',
  'memory.updated',
  'memory.superseded',
  'memory.conflicted'
]);

export const EventPolicyActionSchema = z.enum(['ignore', 'observe', 'capture', 'review', 'immediate']);

export const MemoryAIEventSchema = z.object({
  id: z.string().min(1),
  type: MemoryEventTypeSchema,
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  namespace: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  agent_id: z.string().nullable().optional(),
  data: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  importance: z.number().min(0).max(1).default(0.5),
  policy_action: EventPolicyActionSchema.optional()
});

export const TaskStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'cancelled', 'retrying']);

export const MemoryTaskSchema = z.object({
  id: z.string().min(1),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  type: z.enum([
    'embedding_rebuild',
    'embedding_migration',
    'consolidation',
    'reindex',
    'import_pack',
    'export_pack',
    'integrity_verify',
    'integrity_repair',
    'custom'
  ]),
  name: z.string().min(1),
  status: TaskStatusSchema,
  progress: z.number().min(0).max(100),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
  result: z.record(z.unknown()).nullable().optional(),
  error: z.string().nullable().optional()
});

export const ProgressiveDisclosureLevelSchema = z.enum(['summary', 'canonical', 'evidence', 'conversation']);

export const MemorySnapshotSchema = z.object({
  id: z.string().min(1),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  project_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  memory_count: z.number().int().nonnegative(),
  state_checksum: z.string(),
  created_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export const MemoryVersionSchema = z.object({
  id: z.string().min(1),
  memory_id: z.string().min(1),
  version_number: z.number().int().positive(),
  content: z.string().min(1),
  summary: z.string().nullable().optional(),
  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.string()),
  topics: z.array(z.string()),
  changed_by: z.string(),
  change_reason: z.string(),
  source_evidence: z.string().nullable().optional(),
  created_at: z.string().datetime()
});

export const PrivacyCategorySchema = z.enum([
  'credentials',
  'auth_secrets',
  'private_identifiers',
  'financial',
  'pii',
  'safe'
]);

export const AgentIdentitySchema = z.object({
  agent_id: z.string().min(1),
  agent_type: z.string().min(1),
  client_id: z.string().min(1),
  organization_id: z.string().nullable().optional(),
  user_id: z.string().min(1),
  project_id: z.string().nullable().optional(),
  capabilities: z.array(z.string())
});

