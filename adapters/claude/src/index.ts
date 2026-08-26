import { MemoryAIConversationEvent } from '@sachin97317/types';

export function parseClaudeExport(jsonContent: string): MemoryAIConversationEvent[] {
  const events: MemoryAIConversationEvent[] = [];
  let parsed: any;
  try {
    parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  } catch {
    throw new Error('Invalid JSON provided for Claude export');
  }

  const conversations = Array.isArray(parsed) ? parsed : [parsed];

  for (const convo of conversations) {
    const sessionId = convo.uuid || convo.id || 'claude-session';
    const messages = convo.chat_messages || convo.messages || [];

    for (const msg of messages) {
      const sender = msg.sender || msg.role || 'human';
      let role: 'system' | 'user' | 'assistant' | 'tool' = 'user';
      if (sender === 'assistant') role = 'assistant';
      else if (sender === 'system') role = 'system';
      else if (sender === 'tool') role = 'tool';

      const content = msg.text || msg.content || '';
      if (!content.trim()) continue;

      events.push({
        provider: 'anthropic',
        client: 'claude-code',
        sessionId,
        messageId: msg.uuid || msg.id,
        role,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        timestamp: msg.created_at || new Date().toISOString()
      });
    }
  }

  return events;
}
