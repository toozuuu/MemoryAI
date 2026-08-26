import { MemoryAIEvent, EventPolicyAction, MemoryCandidate } from '@memoryai/types';
import crypto from 'node:crypto';

export class EventNormalizer {
  public normalizeRawEvent(
    raw: {
      type: string;
      tenant_id?: string;
      user_id?: string;
      project_id?: string;
      namespace?: string;
      client_id?: string;
      data?: Record<string, unknown>;
      content?: string;
      importance?: number;
    }
  ): MemoryAIEvent {
    const eventType = (raw.type as any) || 'message.created';
    const importance = raw.importance !== undefined ? raw.importance : this.estimateEventImportance(eventType, raw.data);
    const policyAction = this.evaluatePolicy(eventType, importance, raw.data);

    return {
      id: crypto.randomUUID(),
      type: eventType,
      tenant_id: raw.tenant_id || 'default',
      user_id: raw.user_id || 'default-user',
      project_id: raw.project_id || null,
      namespace: raw.namespace || null,
      client_id: raw.client_id || 'unknown',
      data: raw.data || (raw.content ? { content: raw.content } : {}),
      timestamp: new Date().toISOString(),
      importance,
      policy_action: policyAction
    };
  }

  public estimateEventImportance(type: string, data: Record<string, unknown> = {}): number {
    switch (type) {
      case 'architecture.changed':
      case 'decision.created':
        return 0.95;
      case 'dependency.changed':
        return 0.90;
      case 'handoff.created':
        return 0.85;
      case 'task.blocked':
      case 'error.detected':
        return 0.75;
      case 'task.completed':
        return 0.70;
      case 'file.changed':
        return 0.40;
      case 'session.started':
      case 'session.ended':
        return 0.30;
      default:
        return 0.50;
    }
  }

  public evaluatePolicy(type: string, importance: number, data: Record<string, unknown> = {}): EventPolicyAction {
    if (type === 'architecture.changed' || type === 'dependency.changed' || importance >= 0.9) {
      return 'immediate';
    }
    if (type === 'decision.created' || type === 'handoff.created' || importance >= 0.7) {
      return 'capture';
    }
    if (type === 'error.detected' || (data.confidence && Number(data.confidence) < 0.6)) {
      return 'review';
    }
    if (type === 'file.changed' || type === 'session.started' || importance >= 0.3) {
      return 'observe';
    }
    return 'ignore';
  }

  public eventToCandidate(event: MemoryAIEvent): MemoryCandidate | null {
    if (event.policy_action === 'ignore' || event.policy_action === 'observe') {
      return null;
    }

    const content =
      typeof event.data.content === 'string'
        ? event.data.content
        : typeof event.data.summary === 'string'
        ? event.data.summary
        : `Event [${event.type}]: ${JSON.stringify(event.data)}`;

    return {
      content,
      type: event.type.includes('decision') ? 'decision' : 'fact',
      scope: event.project_id ? 'project' : 'user',
      project_id: event.project_id,
      importance: event.importance,
      confidence: typeof event.data.confidence === 'number' ? event.data.confidence : 1.0,
      source_client: event.client_id || undefined,
      source_references: [event.id]
    };
  }
}

export const eventNormalizer = new EventNormalizer();
