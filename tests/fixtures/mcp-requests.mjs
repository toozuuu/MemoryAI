export const FIXTURE_MCP = {
  initializeRequest: {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-agent', version: '1.0.0' }
    }
  },
  toolsListRequest: {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  },
  autoContextCall: {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'memory_auto_context',
      arguments: {
        query: 'What database and API stack do we use for the backend?',
        userId: 'user-alice'
      }
    }
  },
  rememberCall: {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'memory_remember',
      arguments: {
        content: 'Architectural decision: Use Fastify v4 for the API gateway',
        type: 'decision',
        importance: 0.9,
        userId: 'user-alice'
      }
    }
  },
  explainCall: {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'memory_explain',
      arguments: {
        query: 'Fastify API gateway',
        userId: 'user-alice'
      }
    }
  },
  metricsCall: {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'memory_metrics',
      arguments: {}
    }
  },
  invalidToolCall: {
    jsonrpc: '2.0',
    id: 99,
    method: 'tools/call',
    params: {
      name: 'non_existent_tool',
      arguments: {}
    }
  }
};
