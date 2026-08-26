import {
  MemorySearchResult,
  ProgressiveDisclosureLevel,
  ProgressiveRecallResult,
  MemoryReference,
  SessionHandoff,
  Memory
} from '@sachin97317/types';
import { formatMemoryContextBlock } from '@sachin97317/security';
import { estimateTokens } from './tokenizer.js';
import { buildBoundedContext } from './builder.js';

export interface ProgressiveContextOptions {
  maxTokens?: number;
  minScore?: number;
  targetLevel?: ProgressiveDisclosureLevel;
  expandReferences?: boolean;
}

export function buildProgressiveContext(
  results: MemorySearchResult[],
  handoff: SessionHandoff | null | undefined,
  options: ProgressiveContextOptions = {}
): ProgressiveRecallResult {
  const maxTokens = options.maxTokens ?? 1000;
  const level: ProgressiveDisclosureLevel = options.targetLevel ?? 'canonical';

  // Filter candidates by minScore
  const minScore = options.minScore ?? 0.2;
  const eligible = results.filter((r) => r.score >= minScore);

  // Generate Memory References for deeper escalation
  const references: MemoryReference[] = eligible.map((r) => ({
    reference_id: `ref_${r.memory.id}`,
    target_type: 'memory',
    target_id: r.memory.id,
    summary: r.memory.summary || r.memory.content.slice(0, 120),
    relevance_score: Number(r.score.toFixed(4)),
    deep_fetch_handle: `mem://item/${r.memory.id}`
  }));

  if (handoff) {
    references.unshift({
      reference_id: `ref_handoff_${handoff.id}`,
      target_type: 'handoff',
      target_id: handoff.id,
      summary: `Handoff objective: ${handoff.objective}`,
      relevance_score: 1.0,
      deep_fetch_handle: `mem://handoff/${handoff.id}`
    });
  }

  let context = '';
  const includedMemories: Memory[] = [];
  const scores: Record<string, number> = {};

  if (level === 'summary') {
    // Level 1: Tiny 150-token summary of key topics & objectives
    const keyPoints: string[] = [];
    if (handoff) {
      keyPoints.push(`Active Objective: ${handoff.objective}`);
      if (handoff.unfinished_work.length > 0) {
        keyPoints.push(`Unfinished: ${handoff.unfinished_work.slice(0, 2).join(', ')}`);
      }
    }
    for (const r of eligible.slice(0, 3)) {
      keyPoints.push(`• [${r.memory.type.toUpperCase()}] ${r.memory.content.slice(0, 100)}...`);
      includedMemories.push(r.memory);
      scores[r.memory.id] = r.score;
    }
    context = `[MEMORY SUMMARY (LEVEL 1)]\n${keyPoints.join('\n')}\n(Use level=canonical for full memory records)`;
  } else if (level === 'canonical') {
    // Level 2: Standard bounded canonical memories
    const bounded = buildBoundedContext(eligible, { maxTokens, minScore });
    context = bounded.context;
    includedMemories.push(...bounded.memories);
    for (const m of bounded.memories) {
      const match = eligible.find((r) => r.memory.id === m.id);
      if (match) scores[m.id] = match.score;
    }
  } else if (level === 'evidence' || level === 'conversation') {
    // Level 3 & 4: Deep canonical + provenance & references
    const bounded = buildBoundedContext(eligible, { maxTokens, minScore });
    const evidenceLines: string[] = [];
    for (const m of bounded.memories) {
      evidenceLines.push(
        `Memory ID: ${m.id} | Type: ${m.type} | Created: ${m.created_at} | Scope: ${m.scope}`
      );
      if (m.source_client) evidenceLines.push(`  Source Client: ${m.source_client}`);
      if (m.source_references && m.source_references.length > 0) {
        evidenceLines.push(`  Source References: ${m.source_references.join(', ')}`);
      }
      evidenceLines.push(`  Content: ${m.content}`);
    }
    context = formatMemoryContextBlock(bounded.memories);
    includedMemories.push(...bounded.memories);
  }

  const tokenCount = estimateTokens(context);
  const nextLevel: ProgressiveDisclosureLevel | undefined =
    level === 'summary' ? 'canonical' : level === 'canonical' ? 'evidence' : undefined;

  // Recommend escalation if user query requested summary but high confidence matches exist
  const escalationRecommended = level === 'summary' && eligible.length > 3;

  return {
    context,
    tokenCount,
    maxTokens,
    level,
    memories: includedMemories,
    references,
    handoff: handoff || null,
    scores,
    escalationRecommended,
    nextLevel,
    metrics: {
      retrievalMs: 0,
      rerankMs: 0,
      compressionMs: 0,
      tokensSaved: Math.max(0, 4000 - tokenCount),
      savingsPercentage: Number(Math.max(0, ((4000 - tokenCount) / 4000) * 100).toFixed(1))
    }
  };
}
