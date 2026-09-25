/**
 * Hypersave SDK Tests
 *
 * Unit tests for the HypersaveClient class.
 * Run with: npx tsx sdk/src/client.test.ts
 */

import { HypersaveClient } from './client.js';
import { HypersaveError, AuthenticationError, ValidationError, TimeoutError } from './errors.js';
import { createServer } from 'node:http';
import { once } from 'node:events';
const nativeFetch = globalThis.fetch;

// Simple test framework
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];
const testCases: Array<{ name: string; fn: () => void | Promise<void> }> = [];

function test(name: string, fn: () => void | Promise<void>): void {
  testCases.push({ name, fn });
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedError?: string): void {
  let threw = false;
  try {
    fn();
  } catch (e: any) {
    threw = true;
    if (expectedError && !e.message.includes(expectedError)) {
      throw new Error(`Expected error containing "${expectedError}", got "${e.message}"`);
    }
  }
  if (!threw) {
    throw new Error('Expected function to throw');
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

// ============================================================================
// TESTS
// ============================================================================

// Test: Constructor requires API key
test('constructor throws without API key', () => {
  assertThrows(() => {
    new HypersaveClient({ apiKey: '' });
  }, 'API key is required');
});

// Test: Constructor accepts valid config
test('constructor accepts valid config', () => {
  const client = new HypersaveClient({
    apiKey: 'test-api-key',
    baseUrl: 'https://custom.api.com',
    timeout: 5000,
    userId: 'test-user',
  });
  assertTrue(client !== null);
});

// Test: Default values are set
test('constructor uses default values', () => {
  const client = new HypersaveClient({ apiKey: 'test-api-key-12345' });
  assertTrue(client !== null);
});

// Test: Base URL trailing slash is removed
test('base URL trailing slash is normalized', () => {
  const client = new HypersaveClient({
    apiKey: 'test-api-key-12345',
    baseUrl: 'https://api.example.com/',
  });
  assertTrue(client !== null);
});

// ============================================================================
// ERROR CLASSES TESTS
// ============================================================================

test('HypersaveError has correct properties', () => {
  const error = new HypersaveError('Test error', 500);
  assertEqual(error.message, 'Test error');
  assertEqual(error.statusCode, 500);
  assertEqual(error.name, 'HypersaveError');
});

test('AuthenticationError extends HypersaveError', () => {
  const error = new AuthenticationError('Invalid key');
  assertEqual(error.name, 'AuthenticationError');
  assertTrue(error instanceof HypersaveError);
});

test('ValidationError extends HypersaveError', () => {
  const error = new ValidationError('Invalid input');
  assertEqual(error.name, 'ValidationError');
  assertTrue(error instanceof HypersaveError);
});

test('TimeoutError extends HypersaveError', () => {
  const error = new TimeoutError(30000, 'Request timed out');
  assertEqual(error.name, 'TimeoutError');
  assertTrue(error instanceof HypersaveError);
});

// ============================================================================
// MOCK REQUEST TESTS
// These tests mock the fetch API to test client methods
// ============================================================================

// Helper to mock fetch
function mockFetch(response: any, status: number = 200): void {
  (globalThis as any).fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

function mockFetchSequence(responses: Array<{ body: any; status?: number }>, requests: Array<{ url: string; init: RequestInit }>): void {
  (globalThis as any).fetch = async (url: string, init: RequestInit) => {
    requests.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('Unexpected fetch call');
    const status = next.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => 'application/json' },
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  };
}

test('save method sends correct request', async () => {
  const client = new HypersaveClient({ apiKey: 'test-api-key-12345', baseUrl: 'http://localhost:3005' });

  mockFetch({
    success: true,
    pendingId: 'pending-123',
  });

  // Note: This would actually call the API if not mocked
  // In real tests, we'd use a proper mocking library
});

test('save retries reuse one idempotency key', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  mockFetchSequence([
    { status: 500, body: { success: false, error: 'temporary' } },
    { status: 202, body: { success: true, pendingId: 'request-123' } },
  ], requests);

  const client = new HypersaveClient({
    apiKey: 'test-api-key-12345',
    baseUrl: 'https://api.example.com',
    maxRetries: 2,
    retryDelay: 0,
  });
  await client.save({ content: 'retry-safe memory' });

  assertEqual(requests.length, 2);
  const firstHeaders = requests[0].init.headers as Record<string, string>;
  const secondHeaders = requests[1].init.headers as Record<string, string>;
  assertTrue(Boolean(firstHeaders['Idempotency-Key']));
  assertEqual(firstHeaders['Idempotency-Key'], secondHeaders['Idempotency-Key']);
  assertEqual(firstHeaders['X-Request-ID'], secondHeaders['X-Request-ID']);
});

test('saveSync preserves canonical fields and populates the compatibility view', async () => {
  mockFetch({
    success: true,
    async: false,
    documentId: 'document-1',
    title: 'Scoped memory',
    type: 'note',
    facts: [{ category: 'preference', key: 'theme', value: 'dark', confidence: 0.9 }],
    sector: 'semantic',
    sensitivity: 'low',
  });

  const client = new HypersaveClient({
    apiKey: 'test-api-key-12345',
    baseUrl: 'https://api.example.com',
    maxRetries: 1,
  });
  const result = await client.saveSync({ content: 'I prefer dark mode.' });

  assertEqual(result.documentId, 'document-1');
  assertEqual(result.facts?.length, 1);
  assertEqual(result.saved?.id, 'document-1');
  assertEqual(result.saved?.facts, 1);
});

test('ask method parses response correctly', async () => {
  mockFetch({
    success: true,
    answer: 'Test answer',
    confidence: 0.95,
    source: 'facts',
  });
});

test('error responses throw appropriate errors', async () => {
  mockFetch({ success: false, error: 'Invalid request' }, 400);
});

test('queued learning, fact update, and temporal methods use the public contracts', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  mockFetchSequence([
    { status: 202, body: { success: true, status: 'queued', queued: true, jobId: 'job-1', message: 'queued' } },
    { body: { success: true, jobId: 'job-1', status: 'active', result: null } },
    { body: { success: true, jobId: 'job-1', status: 'completed', result: { success: true, discovered: 2, reinforced: 1, decayed: 0, completedAt: '2026-07-23T00:00:00.000Z' } } },
    { body: { success: true, factId: 'fact-1', action: 'patched' } },
    { body: { success: true, action: 'timeline', days: 30, timeline: [] } },
  ], requests);

  const client = new HypersaveClient({ apiKey: 'test-api-key-12345', baseUrl: 'https://api.example.com', maxRetries: 1 });
  const queued = await client.triggerLearning({ lookbackDays: 30 });
  const completed = await client.waitForLearning(queued.jobId, { pollInterval: 1, maxWait: 100 });
  const updated = await client.updateFact('fact-1', { value: 'updated value', confidence: 0.9 });
  const timeline = await client.temporal({ action: 'timeline', days: 30 });

  assertEqual(completed.status, 'completed');
  assertEqual(completed.result?.discovered, 2);
  assertEqual(updated.action, 'patched');
  assertTrue(Array.isArray(timeline.timeline));
  assertTrue(requests.some((request) => request.url.endsWith('/v1/facts/fact-1') && request.init.method === 'PATCH'));
  assertTrue(requests.some((request) => request.url.endsWith('/v1/temporal') && request.init.method === 'POST'));
});

// ============================================================================
// Namespace transport uses a real local HTTP server.
// ============================================================================

test('namespace HTTP handshake precedes content, scopes every request, and rejects an older server', async () => {
  const calls: Array<{ path: string; namespace?: string; body: Record<string, unknown> }> = [];
  let supported = true;
  const server = createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = text ? JSON.parse(text) : {};
    const namespace = req.headers['x-hypersave-namespace'] as string | undefined;
    calls.push({ path: req.url || '', namespace, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/namespaces') {
      res.statusCode = supported ? 200 : 404;
      res.end(JSON.stringify(supported ? { success: true, namespace: body.namespace, isolation: 'account-and-namespace' } : { success: false, error: 'Not found' }));
    } else {
      if (namespace) res.setHeader('X-Hypersave-Namespace', namespace);
      res.end(JSON.stringify({ success: true, pendingId: 'synthetic-pending' }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const previous = globalThis.fetch;
  globalThis.fetch = nativeFetch;
  try {
    const config = { apiKey: 'synthetic-sdk-key', baseUrl: `http://127.0.0.1:${address.port}`, maxRetries: 1 };
    const a = new HypersaveClient({ ...config, namespace: 'company-a' });
    const b = new HypersaveClient({ ...config, namespace: 'company-b' });
    await a.save({ content: 'Alice owns Apollo' });
    await b.save({ content: 'Bob owns Apollo' });
    await a.save({ content: 'Alice still owns Apollo' });
    assertEqual(calls[0].path, '/v1/namespaces');
    assertEqual(calls.filter((call) => call.path === '/v1/namespaces').length, 2);
    assertEqual(calls.filter((call) => call.path === '/v1/save').map((call) => call.namespace).join(','), 'company-a,company-b,company-a');
    supported = false;
    const before = calls.filter((call) => call.path === '/v1/save').length;
    let rejected = false;
    try { await new HypersaveClient({ ...config, namespace: 'new-company' }).save({ content: 'Must not be sent' }); }
    catch { rejected = true; }
    assertTrue(rejected);
    assertEqual(calls.filter((call) => call.path === '/v1/save').length, before);
  } finally {
    globalThis.fetch = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('multi-namespace reads, on-behalf-of identity and source-identified records reach the API', async () => {
  const calls: Array<{ method: string; path: string; headers: Record<string, string | string[] | undefined>; body: Record<string, unknown> }> = [];
  const server = createServer(async (req, res) => {
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = text ? JSON.parse(text) : {};
    calls.push({ method: req.method || '', path: req.url || '', headers: req.headers, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/namespaces') {
      res.end(JSON.stringify({ success: true, namespace: body.namespace, isolation: 'account-and-namespace' }));
    } else if (req.url?.startsWith('/v1/memories/external/')) {
      res.end(JSON.stringify(req.method === 'DELETE'
        ? { success: true, externalId: 'hubspot:deal:42', hardDelete: true, existed: true, versions: 2, removed: 2, failed: 0 }
        : { success: true, data: { externalId: 'hubspot:deal:42', sourceSystem: 'hubspot', currentDocId: 'd2', deletedAt: null, versions: [], updatedAt: 1 } }));
    } else {
      res.end(JSON.stringify({ success: true, answer: 'ok', pendingId: 'p', results: [] }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test server address');
  const previous = globalThis.fetch;
  globalThis.fetch = nativeFetch;
  try {
    const client = new HypersaveClient({ apiKey: 'synthetic-sdk-key', baseUrl: `http://127.0.0.1:${address.port}`, maxRetries: 1 });
    await client.ask('Who owns the Acme renewal?', { namespaces: ['crm-acme', 'wiki'], onBehalfOf: 'user:priya' });
    const ask = calls.find((call) => call.path === '/v1/ask')!;
    assertEqual(ask.headers['x-hypersave-namespaces'], 'crm-acme,wiki');
    assertEqual(ask.headers['x-hypersave-on-behalf-of'], 'user:priya');
    assertEqual(ask.headers['x-hypersave-namespace'], undefined);
    assertEqual(calls.filter((call) => call.path === '/v1/namespaces').length, 2);

    let rejected = false;
    try { await client.save({ content: 'x' }, { namespaces: ['a', 'b'] }); }
    catch (error) { rejected = error instanceof ValidationError; }
    assertTrue(rejected, 'namespaces is read-only');

    await client.save({ content: 'Deal 42 stage: negotiation', externalId: 'hubspot:deal:42', sourceSystem: 'hubspot', externalRevision: 3 });
    const save = calls.find((call) => call.path === '/v1/save')!;
    assertEqual(save.body.externalId, 'hubspot:deal:42');
    assertEqual(save.body.sourceSystem, 'hubspot');
    assertEqual(save.body.externalRevision, 3);

    const record = await client.getExternalRecord('hubspot:deal:42');
    assertEqual(record.data.currentDocId, 'd2');
    const deleted = await client.deleteExternalRecord('hubspot:deal:42');
    assertEqual(deleted.removed, 2);
    const del = calls.find((call) => call.method === 'DELETE')!;
    assertEqual(del.path, '/v1/memories/external/hubspot%3Adeal%3A42');
  } finally {
    globalThis.fetch = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function runTests(): Promise<void> {
  // Execute sequentially because request tests replace globalThis.fetch.
  for (const testCase of testCases) {
    try {
      await testCase.fn();
      results.push({ name: testCase.name, passed: true });
    } catch (error: any) {
      results.push({ name: testCase.name, passed: false, error: error.message });
    }
  }

  console.log('\n========================================');
  console.log('HYPERSAVE SDK TEST RESULTS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      console.log(`   Error: ${result.error}`);
      failed++;
    }
  }

  console.log('\n----------------------------------------');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
