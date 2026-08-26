#!/usr/bin/env node
import { McpServer } from './mcp-server.js';

const server = new McpServer();
server.startStdio();
