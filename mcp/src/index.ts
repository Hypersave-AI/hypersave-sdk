#!/usr/bin/env node
/**
 * hypersave-mcp: Hypersave memory over the Model Context Protocol (stdio).
 *
 *   HYPERSAVE_API_KEY=hs_... npx hypersave-mcp
 *
 * Optional: HYPERSAVE_API_URL (default https://api.hypersave.io) and
 * HYPERSAVE_NAMESPACE to keep an assistant's memories in their own space.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import HypersaveClient from 'hypersave';
import { TOOLS } from './tools.js';

const apiKey = process.env.HYPERSAVE_API_KEY?.trim();
if (!apiKey) {
  console.error('hypersave-mcp: set HYPERSAVE_API_KEY (create one at https://platform.hypersave.io).');
  process.exit(1);
}

const client = new HypersaveClient({
  apiKey,
  baseUrl: process.env.HYPERSAVE_API_URL?.trim() || undefined,
  namespace: process.env.HYPERSAVE_NAMESPACE?.trim() || undefined,
});

const server = new Server({ name: 'hypersave-memory', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }] };
  try {
    const result = await tool.run(client, (request.params.arguments ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: 'text', text: `${tool.name} failed: ${message}` }] };
  }
});

await server.connect(new StdioServerTransport());
console.error('hypersave-mcp: ready on stdio');
