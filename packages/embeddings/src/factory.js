import { LocalEmbeddingProvider, OpenAIEmbeddingProvider } from './provider.js';
export function getEmbeddingProvider(type) {
    const providerType = type || process.env.MEMORYAI_EMBEDDING_PROVIDER || 'local';
    if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
        return new OpenAIEmbeddingProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small');
    }
    // Default to local zero-dependency semantic provider
    return new LocalEmbeddingProvider();
}
//# sourceMappingURL=factory.js.map