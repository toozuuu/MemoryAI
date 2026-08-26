// Conservative token estimator for LLMs (GPT-4 / Claude / Gemini / Llama)
export function estimateTokens(text) {
    if (!text)
        return 0;
    // Standard approximation: ~4 characters per token in English, with punctuation splitting
    const trimmed = text.trim();
    if (trimmed.length === 0)
        return 0;
    // Split into words and special symbols
    const wordsAndSymbols = trimmed.match(/\w+|[^\w\s]+/g) || [];
    let count = 0;
    for (const part of wordsAndSymbols) {
        if (part.length <= 4) {
            count += 1;
        }
        else {
            count += Math.ceil(part.length / 3.8);
        }
    }
    // Safety ceiling margin: 1 token minimum
    return Math.max(1, count);
}
//# sourceMappingURL=tokenizer.js.map