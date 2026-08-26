import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatGptExport } from '../../adapters/chatgpt/dist/index.js';
import { parseClaudeExport } from '../../adapters/claude/dist/index.js';
import { parseGeminiSession } from '../../adapters/gemini/dist/index.js';
import { parseCursorSession } from '../../adapters/cursor/dist/index.js';
import { parseCodexSession } from '../../adapters/codex/dist/index.js';

test('Provider Adapters: Normalizes multi-client message formats into unified MemoryAIConversationEvent', () => {
  // 1. ChatGPT
  const gptEvents = parseChatGptExport(JSON.stringify([{
    id: 'gpt-convo-1',
    mapping: {
      'node-1': {
        message: {
          id: 'msg-1',
          author: { role: 'user' },
          content: { parts: ['We decided to use Redis for session caching'] },
          create_time: 1700000000
        }
      }
    }
  }]));
  assert.equal(gptEvents.length, 1);
  assert.equal(gptEvents[0].role, 'user');
  assert.equal(gptEvents[0].client, 'chatgpt-web');

  // 2. Claude
  const claudeEvents = parseClaudeExport(JSON.stringify([{
    uuid: 'claude-session-99',
    chat_messages: [{
      uuid: 'msg-claude-1',
      sender: 'user',
      text: 'We use PostgreSQL for all primary storage.'
    }]
  }]));
  assert.equal(claudeEvents.length, 1);
  assert.equal(claudeEvents[0].client, 'claude-code');
  assert.ok(claudeEvents[0].content.includes('PostgreSQL'));

  // 3. Gemini
  const geminiEvents = parseGeminiSession(JSON.stringify({
    sessionId: 'gemini-sess-1',
    contents: [{
      role: 'user',
      parts: [{ text: 'We use Docker multi-stage builds.' }]
    }]
  }));
  assert.equal(geminiEvents.length, 1);
  assert.equal(geminiEvents[0].client, 'gemini-cli');

  // 4. Cursor
  const cursorEvents = parseCursorSession(JSON.stringify({
    id: 'cursor-sess-1',
    conversation: [{
      role: 'user',
      text: 'Prefer arrow functions in all TypeScript files.'
    }]
  }));
  assert.equal(cursorEvents.length, 1);
  assert.equal(cursorEvents[0].client, 'cursor-ide');

  // 5. Codex
  const codexEvents = parseCodexSession(JSON.stringify({
    id: 'codex-sess-1',
    messages: [{
      role: 'user',
      prompt: 'Setup ESLint with typescript-eslint rules.'
    }]
  }));
  assert.equal(codexEvents.length, 1);
  assert.equal(codexEvents[0].client, 'codex-cli');
});
