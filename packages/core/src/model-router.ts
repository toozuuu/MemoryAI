import { ModelRoutingConfig, ModelRoutingMode } from '@memoryai/types';

export class ModelRouter {
  private config: ModelRoutingConfig;

  constructor(config?: Partial<ModelRoutingConfig>) {
    this.config = {
      mode: config?.mode || 'local_only',
      local_embedding_model: config?.local_embedding_model || 'local-semantic-384',
      local_reranker_model: config?.local_reranker_model || 'local-bm25-reranker',
      cloud_fallback_enabled: config?.cloud_fallback_enabled || false
    };
  }

  public getMode(): ModelRoutingMode {
    return this.config.mode;
  }

  public setMode(mode: ModelRoutingMode): void {
    this.config.mode = mode;
  }

  public selectModelForTask(taskType: 'classification' | 'extraction' | 'consolidation' | 'embedding' | 'rerank'): {
    provider: 'local' | 'cloud';
    model: string;
  } {
    if (this.config.mode === 'local_only' || !this.config.cloud_fallback_enabled) {
      return {
        provider: 'local',
        model: taskType === 'embedding' ? this.config.local_embedding_model : 'local-rule-engine'
      };
    }

    switch (taskType) {
      case 'classification':
      case 'embedding':
      case 'rerank':
        return { provider: 'local', model: this.config.local_embedding_model };
      case 'extraction':
      case 'consolidation':
        return this.config.mode === 'quality_optimized'
          ? { provider: 'cloud', model: 'claude-3-5-sonnet' }
          : { provider: 'local', model: 'local-rule-engine' };
      default:
        return { provider: 'local', model: 'local-rule-engine' };
    }
  }
}
