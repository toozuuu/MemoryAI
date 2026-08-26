import {
  BrainDecision,
  Memory,
  MemoryCandidate,
  MemoryFilter,
  MemorySearchResult,
  RecallRequest,
  RecallResult
} from '@memoryai/types';
import { MemoryEngine } from '@memoryai/core';

export interface MemoryAIClientOptions {
  endpoint?: string;
  apiKey?: string;
  tenantId?: string;
  defaultUserId?: string;
  localEngine?: MemoryEngine;
}

export class MemoryAI {
  private endpoint?: string;
  private apiKey?: string;
  private tenantId: string;
  private defaultUserId?: string;
  private localEngine?: MemoryEngine;

  constructor(options: MemoryAIClientOptions = {}) {
    this.endpoint = options.endpoint?.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.tenantId = options.tenantId || 'default';
    this.defaultUserId = options.defaultUserId;
    this.localEngine = options.localEngine;

    // If no endpoint is specified and no engine provided, instantiate local engine
    if (!this.endpoint && !this.localEngine) {
      this.localEngine = new MemoryEngine();
    }
  }

  public async remember(params: {
    userId?: string;
    content: string;
    scope?: 'global' | 'user' | 'project' | 'session';
    projectId?: string | null;
    type?: any;
    importance?: number;
    entities?: string[];
    topics?: string[];
    valid_from?: string;
    valid_to?: string;
  }): Promise<{ memory?: Memory; decision?: BrainDecision; success: boolean }> {
    const userId = params.userId || this.defaultUserId || 'default-user';

    if (this.localEngine) {
      const res = await this.localEngine.remember(
        {
          content: params.content,
          scope: params.scope,
          type: params.type,
          importance: params.importance,
          entities: params.entities,
          topics: params.topics,
          valid_from: params.valid_from,
          valid_to: params.valid_to
        },
        {
          tenant_id: this.tenantId,
          user_id: userId,
          project_id: params.projectId
        }
      );
      return { memory: res.memory, decision: res.decision, success: true };
    }

    const response = await this.request('/v1/memories', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: this.tenantId,
        user_id: userId,
        project_id: params.projectId,
        content: params.content,
        scope: params.scope,
        type: params.type,
        importance: params.importance,
        entities: params.entities,
        topics: params.topics,
        valid_from: params.valid_from,
        valid_to: params.valid_to
      })
    });

    return response;
  }

  public async recall(params: {
    userId?: string;
    query: string;
    projectId?: string | null;
    maxTokens?: number;
    temporalDate?: string;
  }): Promise<RecallResult> {
    const userId = params.userId || this.defaultUserId || 'default-user';

    if (this.localEngine) {
      return this.localEngine.recall({
        tenant_id: this.tenantId,
        user_id: userId,
        query: params.query,
        project_id: params.projectId,
        maxTokens: params.maxTokens,
        temporalDate: params.temporalDate
      });
    }

    return this.request('/v1/context', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: this.tenantId,
        user_id: userId,
        query: params.query,
        project_id: params.projectId,
        maxTokens: params.maxTokens,
        temporalDate: params.temporalDate
      })
    });
  }

  public async search(params: {
    query: string;
    userId?: string;
    projectId?: string | null;
    limit?: number;
  }): Promise<MemorySearchResult[]> {
    const userId = params.userId || this.defaultUserId || 'default-user';

    if (this.localEngine) {
      return this.localEngine.search(
        params.query,
        {
          tenant_id: this.tenantId,
          user_id: userId,
          project_id: params.projectId
        },
        params.limit || 20
      );
    }

    return this.request('/v1/search', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: this.tenantId,
        user_id: userId,
        project_id: params.projectId,
        query: params.query,
        limit: params.limit
      })
    });
  }

  public async forget(id: string, userId?: string): Promise<boolean> {
    const uid = userId || this.defaultUserId || 'default-user';

    if (this.localEngine) {
      return this.localEngine.forget(id, {
        tenant_id: this.tenantId,
        user_id: uid
      });
    }

    await this.request(`/v1/memories/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return true;
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {})
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MemoryAI request failed (${response.status}): ${errorText}`);
    }

    return response.json();
  }
}
