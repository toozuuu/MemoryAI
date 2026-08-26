import { SqliteMemoryStorage } from '@memoryai/storage-sqlite';
import { EmbeddingProvider } from '@memoryai/embeddings';
import { EmbeddingMetadata } from '@memoryai/types';
import { logger } from '@memoryai/observability';

export interface MigrationReport {
  success: boolean;
  model: string;
  dimensions: number;
  migratedCount: number;
  totalCount: number;
  durationMs: number;
  swapped: boolean;
}

export class EmbeddingMigrator {
  constructor(private storage: SqliteMemoryStorage) {}

  public getStatus(targetProvider?: EmbeddingProvider): {
    currentMetadata: EmbeddingMetadata | null;
    totalMemories: number;
    vectorCount: number;
    isCompatible: boolean;
    needsMigration: boolean;
  } {
    const current = this.storage.getEmbeddingMetadata();
    const total = this.storage.count();
    const vectorCount = this.storage.getVectors().size;

    let isCompatible = true;
    let needsMigration = false;

    if (current && targetProvider) {
      if (current.model !== targetProvider.name || current.dimensions !== targetProvider.dimensions) {
        isCompatible = false;
        needsMigration = true;
      }
    } else if (!current && total > 0) {
      needsMigration = true;
    }

    return {
      currentMetadata: current,
      totalMemories: total,
      vectorCount,
      isCompatible,
      needsMigration
    };
  }

  public async migrate(
    newProvider: EmbeddingProvider,
    options: { batchSize?: number; dryRun?: boolean } = {}
  ): Promise<MigrationReport> {
    const startMs = Date.now();
    const batchSize = options.batchSize || 50;
    const allMemories = this.storage.list({}, 10000);
    const totalCount = allMemories.length;

    logger.info(
      { model: newProvider.name, dimensions: newProvider.dimensions, totalCount },
      'Starting embedding migration'
    );

    // Save migration state
    this.storage.saveEmbeddingMetadata({
      model: newProvider.name,
      version: '1.0.0',
      dimensions: newProvider.dimensions,
      distance_metric: 'cosine',
      created_at: new Date().toISOString(),
      vector_count: 0,
      status: 'migrating'
    });

    let migratedCount = 0;

    // Process in batches into vectors_shadow table
    for (let i = 0; i < totalCount; i += batchSize) {
      const chunk = allMemories.slice(i, i + batchSize);
      const texts = chunk.map((m) => m.content);
      const vectors = await newProvider.embedBatch(texts);

      for (let j = 0; j < chunk.length; j++) {
        const mem = chunk[j];
        const vec = vectors[j];

        // Validate vector sanity
        if (!vec || vec.length !== newProvider.dimensions) {
          throw new Error(
            `Vector generation validation failed for memory ${mem.id}: expected ${newProvider.dimensions} dimensions, got ${vec?.length}`
          );
        }

        // Save into shadow vector table
        this.storage.saveVector(mem.id, vec, 'vectors_shadow');
        migratedCount++;
      }
    }

    // Verify shadow table integrity
    const shadowVectors = this.storage.getVectors(undefined, 'vectors_shadow');
    if (shadowVectors.size !== migratedCount) {
      throw new Error(
        `Shadow index verification failed: generated ${migratedCount} vectors but found ${shadowVectors.size} in shadow store`
      );
    }

    let swapped = false;
    if (!options.dryRun) {
      // Perform atomic table swap
      this.storage.swapVectorTables();
      swapped = true;

      // Update metadata to active
      this.storage.saveEmbeddingMetadata({
        model: newProvider.name,
        version: '1.0.0',
        dimensions: newProvider.dimensions,
        distance_metric: 'cosine',
        created_at: new Date().toISOString(),
        vector_count: migratedCount,
        status: 'active'
      });

      logger.info('Embedding table swapped atomically. Migration complete.');
    }

    return {
      success: true,
      model: newProvider.name,
      dimensions: newProvider.dimensions,
      migratedCount,
      totalCount,
      durationMs: Date.now() - startMs,
      swapped
    };
  }

  public rollback(): void {
    this.storage.rollbackVectorTables();
    logger.warn('Rolled back vector tables to previous backup state');
  }
}
