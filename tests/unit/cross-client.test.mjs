import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatGptExport } from '../../adapters/chatgpt/dist/index.js';
import { parseClaudeExport } from '../../adapters/claude/dist/index.js';
import { parseGeminiSession } from '../../adapters/gemini/dist/index.js';
import { parseCursorSession } from '../../adapters/cursor/dist/index.js';
import { parseCodexSession } from '../../adapters/codex/dist/index.js';

test('Cross-Client Adapters: normalize conversations into standard MemoryAIConversationEvent', () => {
  // 1. ChatGPT
  const chatGptEvents = parseChatGptExport(JSON.stringify([{
    id: 'gpt-convo-1',
    mapping: {
      'node-1': {
        message: {
          id: 'msg-1',
          author: { role: 'user' },
          content: { parts: ['How do we structure our monorepo?'] },
          create_time: 1700000000
        }
      }
    }
  }]));
  assert.equal(chatGptEvents.length, 1);
  assert.equal(chatGptEvents[0].provider, 'openai');
  assert.equal(chatGptEvents[0].client, 'chatgpt-web');
  assert.equal(chatGptEvents[0].role, 'user');
  assert.equal(chatGptEvents[0].content, 'How do we structure our monorepo?');

  // 2. Claude Code
  const claudeEvents = parseClaudeExport(JSON.stringify([{
    uuid: 'claude-session-99',
    chat_messages: [{
      uuid: 'msg-claude-1',
      sender: 'assistant',
      text: 'We configured npm workspaces with TypeScript.'
    }]
  }]));
  assert.equal(claudeEvents.length, 1);
  assert.equal(claudeEvents[0].provider, 'anthropic');
  assert.equal(claudeEvents[0].client, 'claude-code');
  assert.equal(claudeEvents[0].role, 'assistant');

  // 3. Gemini CLI
  const geminiEvents = parseGeminiSession(JSON.stringify({
    sessionId: 'gemini-sess-1',
    contents: [{
      role: 'user',
      parts: [{ text: 'We chose SQLite with FTS5.' }]
    }]
  }));
  assert.equal(geminiEvents.length, 1);
  assert.equal(geminiEvents[0].provider, 'google');
  assert.equal(geminiEvents[0].client, 'gemini-cli');

  // 4. Cursor
  const cursorEvents = parseCursorSession(JSON.stringify({
    id: 'cursor-sess-1',
    conversation: [{
      role: 'user',
      text: 'Add error handling middleware.'
    }]
  }));
  assert.equal(cursorEvents.length, 1);
  assert.equal(cursorEvents[0].client, 'cursor-ide');

  // 5. Codex
  const codexEvents = parseCodexSession(JSON.stringify({
    sessionId: 'codex-sess-1',
    turns: [{
      role: 'assistant',
      text: 'Generated unit tests.'
    }]
  }));
  assert.equal(codexEvents.length, 1);
  assert.equal(codexEvents[0].client, 'codex-cli');
});
