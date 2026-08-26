import { MemoryCandidate, Memory, BrainDecision, MemoryReviewItem, MemoryVersion } from '@memoryai/types';
import { privacyClassifier, hashContent } from '@memoryai/security';
import { memoryBrain } from './brain.js';
import crypto from 'node:crypto';

export interface TwoPhaseStorageProvider {
  list(filter?: Record<string, unknown>, limit?: number): Memory[];
  insert(memory: Memory): void;
  insertReviewItem(item: MemoryReviewItem): void;
  insertVersion(version: MemoryVersion): void;
}

export interface PreparedWrite {
  valid: boolean;
  action: string;
  candidate: MemoryCandidate;
  decision: BrainDecision;
  safeContent: string;
  rejectionReason?: string;
  memoryId?: string;
}

export class TwoPhaseMemoryWriter {
  constructor(private storage: TwoPhaseStorageProvider) {}

  // Phase 1: Validate, Privacy Scan & Policy Check
  public prepare(
    candidate: MemoryCandidate,
    context: { tenant_id: string; user_id: string; project_id?: string | null; namespace?: string | null }
  ): PreparedWrite {
    // 1. Privacy classification
    const privacyResult = privacyClassifier.classify(candidate.content);
    if (privacyResult.action === 'reject') {
      return {
        valid: false,
        action: 'REJECTED',
        candidate,
        decision: { action: 'IGNORE', confidence: 0, reason: `Rejected by privacy classifier: ${privacyResult.flagged_patterns.join(', ')}` },
        safeContent: candidate.content,
        rejectionReason: `Rejected by privacy classifier: ${privacyResult.flagged_patterns.join(', ')}`
      };
    }

    const safeContent = privacyResult.redacted_content || candidate.content;

    // 2. Fetch active candidates for deduplication / conflict detection
    const existing = this.storage.list({
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      project_id: context.project_id,
      namespace: context.namespace,
      statuses: ['active', 'probable', 'confirmed']
    }, 100);

    // 3. Memory Brain decision
    const decision = memoryBrain.decide({ ...candidate, content: safeContent }, existing);

    return {
      valid: decision.action !== 'IGNORE',
      action: decision.action,
      candidate: { ...candidate, content: safeContent },
      decision,
      safeContent
    };
  }

  // Phase 2: Atomic Commit
  public commit(
    prepared: PreparedWrite,
    context: { tenant_id: string; user_id: string; project_id?: string | null; namespace?: string | null }
  ): { memory: Memory | null; versionCreated?: boolean } {
    if (!prepared.valid) {
      return { memory: null };
    }

    const now = new Date().toISOString();
    const memId = crypto.randomUUID();
    const contentHash = hashContent(prepared.safeContent);

    if (prepared.decision.action === 'QUARANTINE') {
      // Store in review_queue
      this.storage.insertReviewItem({
        id: crypto.randomUUID(),
        tenant_id: context.tenant_id,
        user_id: context.user_id,
        project_id: context.project_id,
        candidate_content: prepared.safeContent,
        candidate_type: prepared.candidate.type || 'fact',
        reason: prepared.decision.reason,
        risk_level: 'high',
        status: 'pending',
        created_at: now
      });
      return { memory: null };
    }

    const newMemory: Memory = {
      id: memId,
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      scope: prepared.candidate.scope || (context.project_id ? 'project' : 'user'),
      project_id: context.project_id || null,
      namespace: context.namespace || null,
      type: prepared.candidate.type || 'fact',
      content: prepared.safeContent,
      summary: prepared.candidate.summary || null,
      entities: prepared.candidate.entities || [],
      topics: prepared.candidate.topics || [],
      importance: prepared.candidate.importance || 0.8,
      confidence: prepared.candidate.confidence || 1.0,
      durability: prepared.candidate.durability || 0.8,
      freshness: 1.0,
      source_count: 1,
      verification_state: 'unverified',
      created_at: now,
      updated_at: now,
      valid_from: now,
      valid_to: null,
      last_accessed_at: now,
      access_count: 0,
      source_provider: prepared.candidate.source_provider || null,
      source_client: prepared.candidate.source_client || null,
      source_session_id: prepared.candidate.source_session_id || null,
      source_message_id: prepared.candidate.source_message_id || null,
      source_references: prepared.candidate.source_references || [],
      update_reason: prepared.decision.reason,
      parent_memory_id: prepared.decision.target_memory_id || null,
      status: 'active',
      privacy_level: prepared.candidate.privacy_level || 'internal',
      content_hash: contentHash
    };

    this.storage.insert(newMemory);

    // Record initial Version 1 in memory_versions table
    this.storage.insertVersion({
      id: crypto.randomUUID(),
      memory_id: newMemory.id,
      version_number: 1,
      content: newMemory.content,
      summary: newMemory.summary,
      importance: newMemory.importance,
      confidence: newMemory.confidence,
      entities: newMemory.entities,
      topics: newMemory.topics,
      changed_by: context.user_id,
      change_reason: prepared.decision.reason || 'Initial creation',
      source_evidence: prepared.candidate.source_client || null,
      created_at: now
    });

    return { memory: newMemory, versionCreated: true };
  }
}
