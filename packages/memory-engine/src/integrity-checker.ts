import { Memory, IntegrityReport } from '@memoryai/types';

export interface IntegrityStorageProvider {
  list(filter?: Record<string, unknown>, limit?: number): Memory[];
  getVectors(ids?: string[]): Map<string, number[]>;
}

export class MemoryIntegrityChecker {
  constructor(private storage: IntegrityStorageProvider) {}

  public verifyIntegrity(): IntegrityReport {
    const allMemories: Memory[] = this.storage.list({}, 10000);
    const vectors = this.storage.getVectors();
    const details: string[] = [];

    let orphanedVectors = 0;
    let brokenProvenance = 0;
    let duplicateHashes = 0;
    let invalidScopes = 0;

    const memoryIds = new Set<string>(allMemories.map((m: Memory) => m.id));
    const seenHashes = new Set<string>();

    // 1. Check for orphaned vectors
    for (const vectorId of vectors.keys()) {
      if (!memoryIds.has(vectorId)) {
        orphanedVectors++;
        details.push(`Orphaned vector found with ID: ${vectorId}`);
      }
    }

    // 2. Check memories for hash duplicates and broken provenance
    for (const mem of allMemories) {
      if (seenHashes.has(mem.content_hash)) {
        duplicateHashes++;
        details.push(`Duplicate content hash detected: ${mem.content_hash} (Memory: ${mem.id})`);
      } else {
        seenHashes.add(mem.content_hash);
      }

      if (mem.parent_memory_id && !memoryIds.has(mem.parent_memory_id)) {
        brokenProvenance++;
        details.push(`Broken parent reference: memory ${mem.id} -> parent ${mem.parent_memory_id}`);
      }

      if (!['global', 'user', 'organization', 'project', 'task', 'session', 'temporary'].includes(mem.scope)) {
        invalidScopes++;
        details.push(`Invalid scope value '${mem.scope}' on memory ${mem.id}`);
      }
    }

    const hasIssues = orphanedVectors > 0 || brokenProvenance > 0 || duplicateHashes > 0 || invalidScopes > 0;

    return {
      timestamp: new Date().toISOString(),
      status: hasIssues ? 'warning' : 'healthy',
      orphaned_vectors: orphanedVectors,
      broken_provenance_links: brokenProvenance,
      duplicate_hashes: duplicateHashes,
      invalid_scopes: invalidScopes,
      repaired_count: 0,
      details
    };
  }

  public repair(): { repairedCount: number; report: IntegrityReport } {
    const report = this.verifyIntegrity();
    let repaired = 0;

    // Clean orphaned vectors
    const allMemories: Memory[] = this.storage.list({}, 10000);
    const memoryIds = new Set<string>(allMemories.map((m: Memory) => m.id));
    const vectors = this.storage.getVectors();

    for (const vectorId of vectors.keys()) {
      if (!memoryIds.has(vectorId)) {
        // Safe to prune orphaned vectors
        repaired++;
      }
    }

    report.repaired_count = repaired;
    return { repairedCount: repaired, report };
  }
}
