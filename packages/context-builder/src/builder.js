import { formatMemoryContextBlock } from '@sachin97317/security';
import { estimateTokens } from './tokenizer.js';
export function buildBoundedContext(rankedResults, options = {}) {
    const maxTokens = options.maxTokens || 1000;
    const startMs = Date.now();
    const selectedMemories = [];
    const scores = {};
    const seenHashes = new Set();
    // Deduplicate and filter canonical content
    for (const item of rankedResults) {
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
        }
        else if (selectedMemories.length === 0) {
            // If even the first memory exceeds maxTokens alone, compress it
            const compressedContent = mem.summary || mem.content.slice(0, Math.max(100, maxTokens * 3));
            const truncatedMem = {
                ...mem,
                content: `${compressedContent}... [TRUNCATED DUE TO TOKEN BUDGET]`
            };
            selectedMemories.push(truncatedMem);
            scores[mem.id] = item.score;
            break;
        }
        else {
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
//# sourceMappingURL=builder.js.map