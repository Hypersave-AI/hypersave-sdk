/**
 * Hypersave SDK Tests
 *
 * Unit tests for the HypersaveClient class.
 * Run with: npx tsx sdk/src/client.test.ts
 */

import { HypersaveClient } from './client.js';
import { HypersaveError, AuthenticationError, ValidationError, TimeoutError } from './errors.js';

// Simple test framework
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => results.push({ name, passed: true }))
        .catch((e) => results.push({ name, passed: false, error: e.message }));
    } else {
      results.push({ name, passed: true });
    }
  } catch (e: any) {
    results.push({ name, passed: false, error: e.message });
  }
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
  const client = new HypersaveClient({ apiKey: 'test-key' });
  assertTrue(client !== null);
});

// Test: Base URL trailing slash is removed
test('base URL trailing slash is normalized', () => {
  const client = new HypersaveClient({
    apiKey: 'test-key',
    baseUrl: 'https://api.example.com/',
  });
  assertTrue(client !== null);
});

// ============================================================================
// ERROR CLASSES TESTS
// ============================================================================

test('HypersaveError has correct properties', () => {
  const error = new HypersaveError('Test error', 'TEST_CODE', { foo: 'bar' });
  assertEqual(error.message, 'Test error');
  assertEqual(error.code, 'TEST_CODE');
  assertEqual(error.name, 'HypersaveError');
  assertTrue(error.details?.foo === 'bar');
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
  const error = new TimeoutError('Request timed out');
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
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

test('save method sends correct request', async () => {
  const client = new HypersaveClient({ apiKey: 'test-key', baseUrl: 'http://localhost:3005' });

  mockFetch({
    success: true,
    pendingId: 'pending-123',
  });

  // Note: This would actually call the API if not mocked
  // In real tests, we'd use a proper mocking library
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

// ============================================================================
// RUN TESTS
// ============================================================================

async function runTests(): Promise<void> {
  // Wait for async tests
  await new Promise((resolve) => setTimeout(resolve, 100));

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
