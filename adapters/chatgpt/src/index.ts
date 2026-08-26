import { MemoryAIConversationEvent } from '@sachin97317/types';

export function parseChatGptExport(jsonContent: string): MemoryAIConversationEvent[] {
  const events: MemoryAIConversationEvent[] = [];
  let parsed: any;
  try {
    parsed = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  } catch {
    throw new Error('Invalid JSON provided for ChatGPT export');
  }

  const conversations = Array.isArray(parsed) ? parsed : [parsed];

  for (const convo of conversations) {
    const sessionId = convo.id || convo.conversation_id || 'chatgpt-session';
    const mapping = convo.mapping || {};

    for (const msgId of Object.keys(mapping)) {
      const node = mapping[msgId];
      if (!node.message || !node.message.content) continue;

      const authorRole = node.message.author?.role || 'user';
      let role: 'system' | 'user' | 'assistant' | 'tool' = 'user';
      if (authorRole === 'assistant') role = 'assistant';
      else if (authorRole === 'system') role = 'system';
      else if (authorRole === 'tool') role = 'tool';

      const parts = node.message.content.parts || [];
      const text = parts.filter((p: any) => typeof p === 'string').join('\n');
      if (!text.trim()) continue;

      const timestamp = node.message.create_time
        ? new Date(node.message.create_time * 1000).toISOString()
        : new Date().toISOString();

      events.push({
        provider: 'openai',
        client: 'chatgpt-web',
        sessionId,
        messageId: node.message.id || msgId,
        role,
        content: text,
        timestamp,
        metadata: {
          model: node.message.metadata?.model_slug
        }
      });
    }
  }

  return events;
}
