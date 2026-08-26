import { MemoryAIConversationEvent } from '@memoryai/types';

export function parseGeminiSession(data: any): MemoryAIConversationEvent[] {
  const events: MemoryAIConversationEvent[] = [];
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const contents = parsed.contents || parsed.history || (Array.isArray(parsed) ? parsed : []);
  const sessionId = parsed.sessionId || 'gemini-session';

  for (let i = 0; i < contents.length; i++) {
    const item = contents[i];
    const roleStr = item.role || (item.parts ? 'user' : 'model');
    const role: 'user' | 'assistant' | 'system' =
      roleStr === 'model' || roleStr === 'assistant' ? 'assistant' : 'user';

    const parts = item.parts || [{ text: item.text || '' }];
    const text = parts
      .map((p: any) => (typeof p === 'string' ? p : p.text || ''))
      .join('\n');

    if (!text.trim()) continue;

    events.push({
      provider: 'google',
      client: 'gemini-cli',
      sessionId,
      messageId: `gemini-msg-${i}`,
      role,
      content: text,
      timestamp: item.timestamp || new Date().toISOString()
    });
  }

  return events;
}
