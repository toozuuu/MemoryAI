export async function runRetrievalBenchmark(engine, queries, context = { tenant_id: 'default', user_id: 'default-user' }) {
  let totalReciprocalRank = 0;
  let totalPrecisionAtK = 0;
  let totalRecallAtK = 0;
  let totalFalsePositives = 0;
  let relevantQueryCount = 0;
  let negativeQueryCount = 0;

  for (const q of queries) {
    const k = 3;
    const result = await engine.recall({
      tenant_id: context.tenant_id,
      user_id: context.user_id,
      query: q.query,
      project_id: q.projectId,
      maxTokens: 1000
    });

    const retrievedIds = result.memories.map((m) => m.id);
    const expected = q.expectedIds || [];

    if (expected.length > 0) {
      relevantQueryCount += 1;
      let firstMatchRank = 0;
      for (let i = 0; i < retrievedIds.length; i++) {
        if (expected.includes(retrievedIds[i])) {
          firstMatchRank = i + 1;
          break;
        }
      }
      const rr = firstMatchRank > 0 ? 1 / firstMatchRank : 0.0;
      totalReciprocalRank += rr;

      const hits = retrievedIds.slice(0, k).filter((id) => expected.includes(id)).length;
      const precision = hits / Math.min(expected.length, Math.max(1, retrievedIds.length));
      const recall = hits / expected.length;
      totalPrecisionAtK += precision;
      totalRecallAtK += recall;
    } else {
      negativeQueryCount += 1;
      if (retrievedIds.length > 0 && retrievedIds.some((id) => id.includes('angular'))) {
        totalFalsePositives += 1;
      }
    }
  }

  const mrr = totalReciprocalRank / Math.max(1, relevantQueryCount);
  const avgPrecision = totalPrecisionAtK / Math.max(1, relevantQueryCount);
  const avgRecall = totalRecallAtK / Math.max(1, relevantQueryCount);
  const falsePositiveRate = totalFalsePositives / Math.max(1, negativeQueryCount);

  return {
    queriesEvaluated: queries.length,
    relevantQueries: relevantQueryCount,
    mrr: Number(mrr.toFixed(4)),
    precisionAtK: Number(avgPrecision.toFixed(4)),
    recallAtK: Number(avgRecall.toFixed(4)),
    falsePositiveRate: Number(falsePositiveRate.toFixed(4))
  };
}
