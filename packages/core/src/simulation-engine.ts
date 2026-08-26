import { SimulationRun } from '@sachin97317/types';
import { SqliteMemoryStorage } from '@sachin97317/storage-sqlite';
import { MemoryEngine } from './engine.js';
import crypto from 'node:crypto';

export class MemorySimulationEngine {
  public async runSimulation(
    policyName: string,
    testQueries: Array<{ query: string; expectedIds?: string[]; projectId?: string }>,
    sampleMemories: Array<{ content: string; type?: string; importance?: number; projectId?: string }> = []
  ): Promise<SimulationRun> {
    // Spin up an in-memory isolated database for sandbox simulation
    const storage = new SqliteMemoryStorage({ dbPath: ':memory:' });
    const engine = new MemoryEngine({ storage });

    const start = Date.now();
    for (const mem of sampleMemories) {
      await engine.remember({
        content: mem.content,
        type: (mem.type as any) || 'fact',
        importance: mem.importance || 0.8
      }, {
        tenant_id: 'sim_tenant',
        user_id: 'sim_user',
        project_id: mem.projectId || 'sim_project'
      });
    }

    let totalReciprocalRank = 0;
    let totalPrecision = 0;
    let totalRecall = 0;
    let totalTokensSaved = 0;

    for (const q of testQueries) {
      const result = await engine.recall({
        tenant_id: 'sim_tenant',
        user_id: 'sim_user',
        query: q.query,
        project_id: q.projectId || 'sim_project',
        maxTokens: 1000
      });

      totalTokensSaved += result.metrics.tokensSaved;
      const expected = q.expectedIds || [];
      if (expected.length > 0) {
        const retrieved = result.memories.map((m) => m.id);
        let rank = 0;
        for (let i = 0; i < retrieved.length; i++) {
          if (expected.includes(retrieved[i])) {
            rank = i + 1;
            break;
          }
        }
        totalReciprocalRank += rank > 0 ? 1 / rank : 0;
        const hits = retrieved.slice(0, 3).filter((id) => expected.includes(id)).length;
        totalPrecision += hits / Math.min(expected.length, Math.max(1, retrieved.length));
        totalRecall += hits / expected.length;
      }
    }

    const n = Math.max(1, testQueries.length);
    const latency = Date.now() - start;
    storage.close();

    return {
      id: `sim_${crypto.randomUUID()}`,
      policy_name: policyName,
      queries_evaluated: testQueries.length,
      mrr: Number((totalReciprocalRank / n).toFixed(4)),
      precision_at_k: Number((totalPrecision / n).toFixed(4)),
      recall_at_k: Number((totalRecall / n).toFixed(4)),
      tokens_saved: totalTokensSaved,
      latency_ms: latency,
      created_at: new Date().toISOString()
    };
  }
}
