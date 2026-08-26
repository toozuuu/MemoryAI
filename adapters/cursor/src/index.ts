import { MemoryAIConversationEvent } from '@sachin97317/types';

export function parseCursorSession(data: any): MemoryAIConversationEvent[] {
  const events: MemoryAIConversationEvent[] = [];
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const conversation = parsed.conversation || parsed.messages || (Array.isArray(parsed) ? parsed : []);
  const sessionId = parsed.sessionId || parsed.id || 'cursor-session';

  for (let i = 0; i < conversation.length; i++) {
    const msg = conversation[i];
    const role: 'user' | 'assistant' = msg.type === 'user' || msg.role === 'user' ? 'user' : 'assistant';
    const text = msg.text || msg.content || '';
    if (!text.trim()) continue;

    events.push({
      provider: 'anysphere',
      client: 'cursor-ide',
      sessionId,
      messageId: msg.id || `cursor-msg-${i}`,
      role,
      content: text,
      timestamp: msg.timestamp || new Date().toISOString(),
      metadata: {
        workspace: parsed.workspacePath
      }
    });
  }

  return events;
}
