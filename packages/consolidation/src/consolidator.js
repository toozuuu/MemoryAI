import { hashContent } from '@memoryai/security';
import crypto from 'node:crypto';
export function clusterMemoriesByEntity(memories) {
    const clusters = new Map();
    for (const mem of memories) {
        if (mem.status !== 'active')
            continue;
        const primaryKey = mem.entities[0] || mem.topics[0] || 'general';
        if (!clusters.has(primaryKey)) {
            clusters.set(primaryKey, []);
        }
        clusters.get(primaryKey).push(mem);
    }
    return clusters;
}
export function consolidateCluster(clusterKey, memories, context) {
    if (memories.length < 2)
        return null;
    const supersededIds = memories.map((m) => m.id);
    const now = new Date().toISOString();
    // Combine unique facts
    const contents = Array.from(new Set(memories.map((m) => m.content)));
    const combinedContent = contents.join(' | ');
    const allEntities = Array.from(new Set(memories.flatMap((m) => m.entities)));
    const allTopics = Array.from(new Set(memories.flatMap((m) => m.topics)));
    const maxImportance = Math.max(...memories.map((m) => m.importance));
    const avgConfidence = memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length;
    const canonical = {
        id: crypto.randomUUID(),
        tenant_id: context.tenant_id,
        user_id: context.user_id,
        scope: memories[0].scope,
        project_id: memories[0].project_id,
        type: 'semantic',
        content: combinedContent,
        summary: `Consolidated record for ${clusterKey} containing ${memories.length} historical statements.`,
        entities: allEntities,
        topics: allTopics,
        importance: Math.min(1.0, maxImportance + 0.1),
        confidence: Number(avgConfidence.toFixed(2)),
        created_at: now,
        updated_at: now,
        valid_from: memories[0].valid_from || now,
        valid_to: null,
        last_accessed_at: null,
        access_count: memories.reduce((sum, m) => sum + (m.access_count || 0), 0),
        source_provider: 'consolidation_engine',
        source_session_id: null,
        source_message_id: null,
        parent_memory_id: memories[0].id,
        status: 'active',
        privacy_level: 'internal',
        content_hash: hashContent(combinedContent)
    };
    return { canonical, supersededIds };
}
export function runMemoryConsolidation(memories, context) {
    const clusters = clusterMemoriesByEntity(memories);
    const canonicalMemoriesCreated = [];
    const archivedMemoryIds = [];
    for (const [clusterKey, clusterItems] of clusters.entries()) {
        if (clusterItems.length >= 2) {
            const res = consolidateCluster(clusterKey, clusterItems, context);
            if (res) {
                canonicalMemoriesCreated.push(res.canonical);
                archivedMemoryIds.push(...res.supersededIds);
            }
        }
    }
    // Update original memory list
    const consolidatedMemories = memories.map((m) => {
        if (archivedMemoryIds.includes(m.id)) {
            return {
                ...m,
                status: 'archived',
                updated_at: new Date().toISOString()
            };
        }
        return m;
    });
    consolidatedMemories.push(...canonicalMemoriesCreated);
    return {
        consolidatedMemories,
        archivedMemoryIds,
        canonicalMemoriesCreated
    };
}
//# sourceMappingURL=consolidator.js.map