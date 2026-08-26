import { Memory, MemoryConflictRecord, SessionHandoff, ProjectMemoryHealth } from '@sachin97317/types';

export interface HealthStorageProvider {
  list(filter?: Record<string, unknown>, limit?: number): Memory[];
  listConflicts(projectId: string): MemoryConflictRecord[];
  listHandoffs(projectId: string, userId?: string, limit?: number): SessionHandoff[];
}

export class HealthMonitor {
  constructor(private storage: HealthStorageProvider) {}

  public getProjectHealth(projectId: string): ProjectMemoryHealth {
    const memories: Memory[] = this.storage.list({ project_id: projectId }, 5000);
    const conflicts: MemoryConflictRecord[] = this.storage.listConflicts(projectId);
    const handoffs: SessionHandoff[] = this.storage.listHandoffs(projectId, undefined, 10);
    const diagnostics: string[] = [];

    const totalMemories = memories.length;
    const activeConflicts = conflicts.filter((c: MemoryConflictRecord) => c.status === 'unresolved').length;
    const quarantinedMemories = memories.filter((m: Memory) => m.status === 'quarantined').length;

    // 1. Freshness (based on memories updated in last 90 days)
    const now = Date.now();
    const freshCount = memories.filter((m: Memory) => {
      const updatedMs = new Date(m.updated_at).getTime();
      return (now - updatedMs) / (1000 * 60 * 60 * 24) <= 90;
    }).length;
    const freshnessScore = totalMemories > 0 ? Math.round((freshCount / totalMemories) * 100) : 100;

    // 2. Confidence (average confidence * 100)
    const avgConfidence = totalMemories > 0
      ? memories.reduce((acc: number, m: Memory) => acc + (m.confidence || 1.0), 0) / totalMemories
      : 1.0;
    const confidenceScore = Math.round(avgConfidence * 100);

    // 3. Conflict-free score
    const conflictScore = Math.max(0, 100 - activeConflicts * 15);

    // 4. Provenance score (memories having source_client or source_references)
    const provenanceCount = memories.filter((m: Memory) => m.source_client || (m.source_references && m.source_references.length > 0)).length;
    const provenanceScore = totalMemories > 0 ? Math.round((provenanceCount / totalMemories) * 100) : 100;

    // 5. Handoff completeness
    const handoffScore = handoffs.length > 0 ? 100 : 70;

    // Overall Weighted Score
    const overallScore = Math.round(
      freshnessScore * 0.20 +
      confidenceScore * 0.25 +
      conflictScore * 0.25 +
      provenanceScore * 0.15 +
      handoffScore * 0.15
    );

    if (activeConflicts > 0) diagnostics.push(`${activeConflicts} unresolved memory conflict(s) detected.`);
    if (quarantinedMemories > 0) diagnostics.push(`${quarantinedMemories} quarantined memory item(s) pending review.`);
    if (freshnessScore < 70) diagnostics.push(`Stale memory ratio is elevated; consider running maintenance consolidation.`);
    if (diagnostics.length === 0) diagnostics.push(`Project memory is healthy, consistent, and well-indexed.`);

    return {
      project_id: projectId,
      overall_score: Math.min(100, Math.max(0, overallScore)),
      components: {
        freshness_score: freshnessScore,
        confidence_score: confidenceScore,
        conflict_free_score: conflictScore,
        provenance_score: provenanceScore,
        handoff_completeness_score: handoffScore
      },
      metrics: {
        total_memories: totalMemories,
        active_conflicts: activeConflicts,
        stale_memories: totalMemories - freshCount,
        quarantined_memories: quarantinedMemories,
        duplicate_candidates: 0
      },
      diagnostic_summary: diagnostics
    };
  }
}
