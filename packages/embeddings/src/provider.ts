import { normalizeVector } from './vector-math.js';

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  public name = 'local-semantic-384';
  public dimensions = 384;

  private fnv1aHash(str: string, seed = 0x811c9dc5): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  public async embed(text: string): Promise<number[]> {
    const vector = new Array(this.dimensions).fill(0);
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return vector;

    const words = cleaned.split(/[^a-z0-9_]+/i).filter((w) => w.length > 0);

    // 1. Unigram feature hashing
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const h1 = this.fnv1aHash(word, 0);
      const h2 = this.fnv1aHash(word, 0x5bd1e995);
      const index = h1 % this.dimensions;
      const sign = (h2 & 1) === 0 ? 1 : -1;
      const weight = 1.0 / Math.sqrt(Math.max(1, word.length));
      vector[index] += sign * weight;

      // Subword character trigrams for typo & morphological tolerance
      if (word.length >= 3) {
        for (let j = 0; j <= word.length - 3; j++) {
          const tri = word.substring(j, j + 3);
          const triH1 = this.fnv1aHash(tri, 0x9747b28c);
          const triIdx = triH1 % this.dimensions;
          vector[triIdx] += sign * 0.35;
        }
      }
    }

    // 2. Bigram sequential context
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      const bgH = this.fnv1aHash(bigram, 0x1234567);
      const bgIdx = bgH % this.dimensions;
      vector[bgIdx] += 0.75;
    }

    return normalizeVector(vector);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public name = 'openai';
  public dimensions = 1536;

  constructor(
    private apiKey: string,
    private model = 'text-embedding-3-small',
    private baseUrl = 'https://api.openai.com/v1'
  ) {}

  public async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embeddings API failed with status ${response.status}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((d) => d.embedding);
  }
}
