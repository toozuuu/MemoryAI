import { z } from 'zod';
export const MemoryScopeSchema = z.enum(['global', 'user', 'project', 'session']);
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
    'confirmed',
    'superseded',
    'archived',
    'deleted'
]);
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
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    valid_from: z.string().datetime().nullable().optional(),
    valid_to: z.string().datetime().nullable().optional(),
    last_accessed_at: z.string().datetime().nullable().optional(),
    access_count: z.number().int().nonnegative().default(0),
    source_provider: z.string().nullable().optional(),
    source_session_id: z.string().nullable().optional(),
    source_message_id: z.string().nullable().optional(),
    parent_memory_id: z.string().nullable().optional(),
    status: MemoryStatusSchema.default('active'),
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
    valid_from: z.string().datetime().optional(),
    valid_to: z.string().datetime().optional(),
    source_provider: z.string().optional(),
    source_session_id: z.string().optional(),
    source_message_id: z.string().optional(),
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
    privacy_level: MemoryPrivacyLevelSchema.optional()
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
export const MemoryPackManifestSchema = z.object({
    schema_version: z.string(),
    created_at: z.string().datetime(),
    exported_by: z.string(),
    tenant_id: z.string(),
    user_id: z.string(),
    project_id: z.string().nullable(),
    memory_count: z.number().int().nonnegative(),
    relationship_count: z.number().int().nonnegative(),
    checksum: z.string(),
    format_version: z.literal('1.0.0')
});
//# sourceMappingURL=schemas.js.map