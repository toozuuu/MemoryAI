export interface EmbeddingProvider {
    name: string;
    dimensions: number;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export declare class LocalEmbeddingProvider implements EmbeddingProvider {
    name: string;
    dimensions: number;
    private fnv1aHash;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    private apiKey;
    private model;
    private baseUrl;
    name: string;
    dimensions: number;
    constructor(apiKey: string, model?: string, baseUrl?: string);
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
}
//# sourceMappingURL=provider.d.ts.map