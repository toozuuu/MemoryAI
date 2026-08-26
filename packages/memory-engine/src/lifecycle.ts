import { Memory, MemoryCandidate, MemoryPrivacyLevel, MemoryScope, MemoryType } from '@sachin97317/types';
import { hashContent } from '@sachin97317/security';
import { extractEntitiesAndTopics } from '@sachin97317/extraction';
import crypto from 'node:crypto';

export function createMemoryFromCandidate(
  candidate: MemoryCandidate,
  context: { tenant_id: string; user_id: string; project_id?: string | null }
): Memory {
  const now = new Date().toISOString();
  const { entities, topics } = extractEntitiesAndTopics(candidate.content);

  const combinedEntities = Array.from(new Set([...(candidate.entities || []), ...entities]));
  const combinedTopics = Array.from(new Set([...(candidate.topics || []), ...topics]));

  return {
    id: crypto.randomUUID(),
    tenant_id: context.tenant_id,
    user_id: context.user_id,
    scope: (candidate.scope || 'user') as MemoryScope,
    project_id: candidate.project_id !== undefined ? candidate.project_id : context.project_id || null,
    type: (candidate.type || 'semantic') as MemoryType,
    content: candidate.content.trim(),
    summary: candidate.summary || null,
    entities: combinedEntities,
    topics: combinedTopics,
    importance: candidate.importance ?? 0.5,
    confidence: candidate.confidence ?? 1.0,
    durability: candidate.durability ?? 0.5,
    freshness: candidate.freshness ?? 1.0,
    source_count: 1,
    verification_state: 'unverified',
    created_at: now,
    updated_at: now,
    valid_from: candidate.valid_from || now,
    valid_to: candidate.valid_to || null,
    last_accessed_at: null,
    access_count: 0,
    source_provider: candidate.source_provider || null,
    source_client: candidate.source_client || null,
    source_session_id: candidate.source_session_id || null,
    source_message_id: candidate.source_message_id || null,
    source_references: candidate.source_references || [],
    update_reason: null,
    parent_memory_id: null,
    status: 'active',
    privacy_level: (candidate.privacy_level || 'internal') as MemoryPrivacyLevel,
    content_hash: hashContent(candidate.content.trim())
  };
}

export function handleTemporalConflict(
  existingMemory: Memory,
  newCandidate: MemoryCandidate,
  context: { tenant_id: string; user_id: string; project_id?: string | null }
): { supersededMemory: Memory; newMemory: Memory } {
  const now = new Date().toISOString();

  // Invalidate previous memory by marking valid_to and status superseded
  const supersededMemory: Memory = {
    ...existingMemory,
    valid_to: now,
    status: 'superseded',
    updated_at: now
  };

  // Create new active memory with valid_from set to now and parent link
  const newMemory = createMemoryFromCandidate(
    {
      ...newCandidate,
      valid_from: now,
      valid_to: undefined
    },
    context
  );
  newMemory.parent_memory_id = existingMemory.id;

  return {
    supersededMemory,
    newMemory
  };
}
