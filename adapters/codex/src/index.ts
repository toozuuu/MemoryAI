import { MemoryAIConversationEvent } from '@sachin97317/types';

export function parseCodexSession(data: any): MemoryAIConversationEvent[] {
  const events: MemoryAIConversationEvent[] = [];
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const turns = parsed.turns || parsed.messages || (Array.isArray(parsed) ? parsed : []);
  const sessionId = parsed.sessionId || 'codex-session';

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const role: 'user' | 'assistant' | 'tool' =
      turn.role === 'assistant' ? 'assistant' : turn.role === 'tool' ? 'tool' : 'user';
    const text = turn.text || turn.content || turn.prompt || turn.completion || '';
    if (!text.trim()) continue;

    events.push({
      provider: 'openai',
      client: 'codex-cli',
      sessionId,
      messageId: turn.id || `codex-msg-${i}`,
      role,
      content: text,
      timestamp: turn.timestamp || new Date().toISOString()
    });
  }

  return events;
}
