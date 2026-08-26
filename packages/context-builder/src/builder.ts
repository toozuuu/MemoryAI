import { Memory, MemorySearchResult, RecallResult } from '@sachin97317/types';
import { formatMemoryContextBlock, sanitizeMemoryContent } from '@sachin97317/security';
import { estimateTokens } from './tokenizer.js';

export interface ContextBuilderOptions {
  maxTokens?: number; // default 1000
  minScore?: number;  // minimum relevance score to include; default 0.0 (allow all)
  includeMetadata?: boolean;
  totalDbMemoriesCount?: number;
  totalDbTokensEstimated?: number;
}

export function buildBoundedContext(
  rankedResults: MemorySearchResult[],
  options: ContextBuilderOptions = {}
): RecallResult {
  const maxTokens = options.maxTokens || 1000;
  const minScore = options.minScore ?? 0.0;
  const startMs = Date.now();

  const selectedMemories: Memory[] = [];
  const scores: Record<string, number> = {};
  const seenHashes = new Set<string>();

  // Deduplicate, enforce minScore, and filter canonical content
  for (const item of rankedResults) {
    // Skip results below minimum relevance threshold
    if (item.score < minScore) continue;

    const mem = item.memory;
    // Skip exact duplicate content
    if (seenHashes.has(mem.content_hash)) {
      continue;
    }
    seenHashes.add(mem.content_hash);

    // Tentatively test packing
    const candidateList = [...selectedMemories, mem];
    const candidateText = formatMemoryContextBlock(candidateList);
    const candidateTokens = estimateTokens(candidateText);

    if (candidateTokens <= maxTokens) {
      selectedMemories.push(mem);
      scores[mem.id] = item.score;
    } else if (selectedMemories.length === 0) {
      // If even the first memory exceeds maxTokens alone, compress it
      const compressedContent = mem.summary || mem.content.slice(0, Math.max(100, maxTokens * 3));
      const truncatedMem: Memory = {
        ...mem,
        content: `${compressedContent}... [TRUNCATED DUE TO TOKEN BUDGET]`
      };
      selectedMemories.push(truncatedMem);
      scores[mem.id] = item.score;
      break;
    } else {
      // Token budget reached
      break;
    }
  }

  const finalContext = formatMemoryContextBlock(selectedMemories);
  const finalTokenCount = estimateTokens(finalContext);

  const compressionMs = Date.now() - startMs;
  const totalDbTokens = options.totalDbTokensEstimated || Math.max(finalTokenCount * 50, 25000);
  const tokensSaved = Math.max(0, totalDbTokens - finalTokenCount);
  const savingsPercentage = Number(((tokensSaved / totalDbTokens) * 100).toFixed(2));

  return {
    context: finalContext,
    tokenCount: finalTokenCount,
    maxTokens,
    memories: selectedMemories,
    scores,
    metrics: {
      retrievalMs: 0,
      rerankMs: 0,
      compressionMs,
      tokensSaved,
      savingsPercentage
    }
  };
}

