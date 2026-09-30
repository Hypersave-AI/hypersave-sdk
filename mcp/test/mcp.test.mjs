import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withMockApi(fn) {
  const calls = [];
  const api = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push({ method: req.method, url: req.url, key: req.headers['x-api-key'] || req.headers.authorization, body });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ success: true, results: [{ content: 'Pixel is a border collie' }] }));
    });
  });
  await new Promise((r) => api.listen(0, '127.0.0.1', r));
  try {
    return await fn(`http://127.0.0.1:${api.address().port}`, calls);
  } finally {
    api.close();
  }
}

async function connect(env) {
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [new URL('../dist/index.js', import.meta.url).pathname], env: { ...process.env, ...env } }));
  return client;
}

test('lists the 13 memory tools', async () => {
  await withMockApi(async (url) => {
    const client = await connect({ HYPERSAVE_API_KEY: 'hs_test_key', HYPERSAVE_API_URL: url });
    const { tools } = await client.listTools();
    assert.equal(tools.length, 13);
    assert.ok(tools.every((t) => t.name.startsWith('hypersave_') && t.inputSchema?.type === 'object'));
    await client.close();
  });
});

test('a tool call reaches the public API with the key', async () => {
  await withMockApi(async (url, calls) => {
    const client = await connect({ HYPERSAVE_API_KEY: 'hs_test_key', HYPERSAVE_API_URL: url });
    const result = await client.callTool({ name: 'hypersave_search', arguments: { query: 'dog', limit: 3 } });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.match(result.content[0].text, /border collie/);
    const call = calls.find((c) => c.url.startsWith('/v1/search'));
    assert.ok(call, JSON.stringify(calls));
    assert.match(String(call.key), /hs_test_key/);
    await client.close();
  });
});

test('missing arguments come back as a tool error, not a crash', async () => {
  await withMockApi(async (url) => {
    const client = await connect({ HYPERSAVE_API_KEY: 'hs_test_key', HYPERSAVE_API_URL: url });
    const result = await client.callTool({ name: 'hypersave_save', arguments: {} });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /"content" is required/);
    await client.close();
  });
});
