import { MemorySnapshot, MemoryDiff } from '@memoryai/types';
import { SqliteMemoryStorage } from '@memoryai/storage-sqlite';
import { hashContent } from '@memoryai/security';
import crypto from 'node:crypto';

export class SnapshotManager {
  constructor(private storage: SqliteMemoryStorage) {}

  public createSnapshot(
    name: string,
    description: string,
    context: { tenant_id?: string; user_id?: string; project_id: string }
  ): MemorySnapshot {
    const memories = this.storage.list({ project_id: context.project_id }, 10000);
    const sortedContents = memories.map((m) => `${m.id}:${m.content_hash}`).sort().join('|');
    const checksum = hashContent(sortedContents);

    const snapshot: MemorySnapshot = {
      id: `snap_${crypto.randomUUID()}`,
      tenant_id: context.tenant_id || 'default',
      user_id: context.user_id || 'default-user',
      project_id: context.project_id,
      name,
      description,
      memory_count: memories.length,
      state_checksum: checksum,
      created_at: new Date().toISOString(),
      metadata: {
        memory_ids: memories.map((m) => m.id)
      }
    };

    this.storage.insertSnapshot(snapshot);
    return snapshot;
  }

  public listSnapshots(projectId: string): MemorySnapshot[] {
    return this.storage.listSnapshots(projectId);
  }

  public getSnapshot(id: string): MemorySnapshot | null {
    return this.storage.getSnapshotById(id);
  }

  public compareSnapshots(snapshotAId: string, snapshotBId: string): {
    sameState: boolean;
    memoriesAdded: number;
    memoriesRemoved: number;
    memoriesRetained: number;
  } {
    const snapA = this.storage.getSnapshotById(snapshotAId);
    const snapB = this.storage.getSnapshotById(snapshotBId);
    if (!snapA || !snapB) {
      throw new Error('One or both snapshots not found');
    }

    const idsA = new Set<string>((snapA.metadata?.memory_ids as string[]) || []);
    const idsB = new Set<string>((snapB.metadata?.memory_ids as string[]) || []);

    let retained = 0;
    for (const id of idsA) {
      if (idsB.has(id)) retained++;
    }

    const added = idsB.size - retained;
    const removed = idsA.size - retained;

    return {
      sameState: snapA.state_checksum === snapB.state_checksum,
      memoriesAdded: added,
      memoriesRemoved: removed,
      memoriesRetained: retained
    };
  }

  public computeMemoryDiff(memoryId: string, fromVersion: number, toVersion: number): MemoryDiff {
    const versions = this.storage.getVersionsByMemoryId(memoryId);
    const vFrom = versions.find((v) => v.version_number === fromVersion);
    const vTo = versions.find((v) => v.version_number === toVersion);

    if (!vFrom || !vTo) {
      throw new Error(`Versions ${fromVersion} or ${toVersion} not found for memory ${memoryId}`);
    }

    const changedFields: string[] = [];
    if (vFrom.content !== vTo.content) changedFields.push('content');
    if (vFrom.importance !== vTo.importance) changedFields.push('importance');
    if (vFrom.confidence !== vTo.confidence) changedFields.push('confidence');
    if (JSON.stringify(vFrom.entities) !== JSON.stringify(vTo.entities)) changedFields.push('entities');
    if (JSON.stringify(vFrom.topics) !== JSON.stringify(vTo.topics)) changedFields.push('topics');

    return {
      memory_id: memoryId,
      from_version: fromVersion,
      to_version: toVersion,
      content_changed: vFrom.content !== vTo.content,
      old_content: vFrom.content,
      new_content: vTo.content,
      changed_fields: changedFields,
      reason: vTo.change_reason || 'Version update',
      timestamp: vTo.created_at
    };
  }
}
