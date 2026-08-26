export class MockEmbeddingProvider {
  constructor(dimensions = 384) {
    this.dimensions = dimensions;
    this.failNext = false;
    this.callCount = 0;
  }

  async embed(text) {
    this.callCount++;
    if (this.failNext) {
      this.failNext = false;
      throw new Error('Simulated embedding provider outage (503 Service Unavailable)');
    }
    // Deterministic embedding generator
    const vec = new Array(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = (text.charCodeAt(i) * 31 + i) % this.dimensions;
      vec[idx] += 1;
    }
    // Normalize
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  async embedBatch(texts) {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  getDimensions() {
    return this.dimensions;
  }

  getModelName() {
    return `mock-embedding-${this.dimensions}d`;
  }
}

export function simulateLatency(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
