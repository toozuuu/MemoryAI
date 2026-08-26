export const FIXTURE_EVENTS = {
  claudeConversation: [
    {
      id: 'event_claude_1',
      source_client: 'claude-code',
      role: 'user',
      content: 'We need to switch from Jest to Vitest for our unit tests because Vitest has native ESM support',
      timestamp: '2026-08-26T10:00:00.000Z',
      session_id: 'session_claude_101',
      project_id: 'proj_backend_fastify'
    },
    {
      id: 'event_claude_2',
      source_client: 'claude-code',
      role: 'assistant',
      content: 'Great choice. I will update vitest.config.ts and replace the test runner in package.json.',
      timestamp: '2026-08-26T10:00:05.000Z',
      session_id: 'session_claude_101',
      project_id: 'proj_backend_fastify'
    }
  ],
  cursorConversation: [
    {
      id: 'event_cursor_1',
      source_client: 'cursor',
      role: 'user',
      content: 'I always prefer using Tailwind CSS utility classes instead of CSS modules in this repo',
      timestamp: '2026-08-26T11:00:00.000Z',
      session_id: 'session_cursor_202',
      project_id: 'proj_frontend_angular'
    }
  ],
  geminiConversation: [
    {
      id: 'event_gemini_1',
      source_client: 'gemini-cli',
      role: 'user',
      content: 'Architectural note: The billing database must be backed up hourly using WAL archiving',
      timestamp: '2026-08-26T12:00:00.000Z',
      session_id: 'session_gemini_303',
      project_id: 'proj_legacy_mysql'
    }
  ]
};
