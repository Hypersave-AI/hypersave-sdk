/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */

import {
  HypersaveConfig,
  SaveOptions,
  SaveResult,
  SaveStatus,
  AskResult,
  SearchOptions,
  SearchResult,
  QueryOptions,
  QueryResult,
  GetMemoriesOptions,
  MemoriesResult,
  ProfileResult,
  GraphResult,
  RemindOptions,
  RemindResult,
  UsageResult,
  DeleteResult,
  V7SearchOptions,
  V7SearchResult,
  V7AskResult,
  V7IngestOptions,
  V7IngestResult,
  V7EntitiesResult,
  V7EntityResult,
  V7FactsResult,
} from './types.js';

import {
  HypersaveError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  NetworkError,
  ParseError,
  createErrorFromStatus,
} from './errors.js';

/** Request method type for V7Client */
type RequestMethod = <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, any>,
  options?: { userId?: string }
) => Promise<T>;

const DEFAULT_BASE_URL = 'https://api.hypersave.io';
const DEFAULT_TIMEOUT = 30000;

/**
 * Hypersave API Client
 *
 * @example
 * ```typescript
 * import { HypersaveClient } from 'hypersave';
 *
 * const client = new HypersaveClient({ apiKey: 'your-api-key' });
 *
 * // Save content
 * const saved = await client.save({ content: 'Hello world' });
 *
 * // Ask a question
 * const answer = await client.ask('What did I save?');
 * ```
 */
export class HypersaveClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultUserId?: string;

  /** V7 enhanced API methods */
  public readonly v7: V7Client;

  constructor(config: HypersaveConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.defaultUserId = config.userId;

    // Initialize V7 client
    this.v7 = new V7Client(this);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, any>,
    options?: { userId?: string }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      };

      // Add user ID header if available
      const userId = options?.userId || body?.userId || this.defaultUserId;
      if (userId) {
        headers['x-user-id'] = userId;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        if (!response.ok) {
          throw createErrorFromStatus(response.status, text || 'Request failed');
        }
        throw new ParseError('Expected JSON response', text);
      }

      const data = await response.json();

      // Handle API-level errors
      if (!response.ok || data.success === false) {
        const errorMessage = data.error || data.message || 'Request failed';
        throw createErrorFromStatus(response.status, errorMessage, data.details);
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        throw new TimeoutError(this.timeout);
      }

      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError('Failed to connect to Hypersave API', error);
      }

      // Re-throw Hypersave errors as-is
      if (error instanceof HypersaveError) {
        throw error;
      }

      // Wrap unknown errors
      throw new HypersaveError(error.message || 'Unknown error', undefined, error);
    }
  }

  // ============================================================================
  // CORE METHODS
  // ============================================================================

  /**
   * Save content to your Hypersave memory
   *
   * @example
   * ```typescript
   * // Save text (async by default)
   * const result = await client.save({ content: 'Meeting notes: ...' });
   *
   * // Save a URL
   * const result = await client.save({
   *   content: 'https://example.com/article',
   *   category: 'Research'
   * });
   *
   * // Save and wait for completion
   * const result = await client.saveSync({ content: 'Important note' });
   * ```
   */
  async save(options: SaveOptions): Promise<SaveResult> {
    if (!options.content) {
      throw new ValidationError('Content is required');
    }

    return this.request<SaveResult>('POST', '/v1/save', {
      content: options.content,
      title: options.title,
      type: options.type,
      category: options.category,
      async: options.async !== false, // Default to async
      userId: options.userId,
    });
  }

  /**
   * Save content synchronously (waits for completion)
   *
   * @example
   * ```typescript
   * const result = await client.saveSync({ content: 'My note' });
   * console.log(`Saved with ${result.saved?.facts} facts`);
   * ```
   */
  async saveSync(options: Omit<SaveOptions, 'async'>): Promise<SaveResult> {
    return this.save({ ...options, async: false });
  }

  /**
   * Check the status of an async save operation
   *
   * @example
   * ```typescript
   * const save = await client.save({ content: 'Long article...' });
   * if (save.pendingId) {
   *   const status = await client.getSaveStatus(save.pendingId);
   *   console.log(status.status); // 'processing', 'indexed', 'complete', or 'error'
   * }
   * ```
   */
  async getSaveStatus(pendingId: string): Promise<SaveStatus> {
    if (!pendingId) {
      throw new ValidationError('Pending ID is required');
    }

    return this.request<SaveStatus>('GET', `/v1/save/status/${encodeURIComponent(pendingId)}`);
  }

  /**
   * Ask a question and get a verified answer from your memories
   *
   * @example
   * ```typescript
   * const result = await client.ask('What did I learn about TypeScript?');
   * console.log(result.answer);
   * console.log(`Confidence: ${result.confidence}`);
   * ```
   */
  async ask(query: string, options?: { userId?: string }): Promise<AskResult> {
    if (!query) {
      throw new ValidationError('Query is required');
    }

    return this.request<AskResult>('POST', '/v1/ask', {
      query,
      userId: options?.userId,
    });
  }

  /**
   * Search your documents and facts
   *
   * @example
   * ```typescript
   * const results = await client.search('machine learning', { limit: 10 });
   * for (const result of results.results) {
   *   console.log(`[${result.type}] ${result.content}`);
   * }
   * ```
   */
  async search(query: string, options?: Omit<SearchOptions, 'query'>): Promise<SearchResult> {
    if (!query) {
      throw new ValidationError('Query is required');
    }

    return this.request<SearchResult>('POST', '/v1/search', {
      query,
      includeContext: options?.includeContext,
      limit: options?.limit,
      userId: options?.userId,
    });
  }

  /**
   * Multi-strategy memory search with reminders
   *
   * @example
   * ```typescript
   * const result = await client.query('coffee meeting', { limit: 20 });
   * console.log(`Found ${result.stats.totalResults} results`);
   * if (result.reminders.length > 0) {
   *   console.log('Reminder:', result.reminders[0].content);
   * }
   * ```
   */
  async query(message: string, options?: Omit<QueryOptions, 'message'>): Promise<QueryResult> {
    if (!message) {
      throw new ValidationError('Message is required');
    }

    return this.request<QueryResult>('POST', '/v1/query', {
      message,
      skipMemory: options?.skipMemory,
      limit: options?.limit,
      userId: options?.userId,
    });
  }

  /**
   * Get all saved memories (documents and facts count)
   *
   * @example
   * ```typescript
   * const memories = await client.getMemories({ limit: 100 });
   * console.log(`${memories.total} documents, ${memories.facts} facts`);
   * ```
   */
  async getMemories(options?: GetMemoriesOptions): Promise<MemoriesResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<MemoriesResult>('GET', `/v1/memories${query ? `?${query}` : ''}`);
  }

  /**
   * Get your user profile built from facts
   *
   * @example
   * ```typescript
   * const profile = await client.getProfile();
   * console.log(profile.profile);
   * console.log(`${profile.facts.length} total facts`);
   * ```
   */
  async getProfile(options?: { userId?: string }): Promise<ProfileResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<ProfileResult>('GET', `/v1/profile${query ? `?${query}` : ''}`);
  }

  /**
   * Get your knowledge graph
   *
   * @example
   * ```typescript
   * const graph = await client.getGraph();
   * console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
   * ```
   */
  async getGraph(options?: { userId?: string }): Promise<GraphResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<GraphResult>('GET', `/v1/graph${query ? `?${query}` : ''}`);
  }

  /**
   * Delete a memory by ID
   *
   * @example
   * ```typescript
   * await client.deleteMemory('doc-123');
   * ```
   */
  async deleteMemory(id: string, options?: { userId?: string }): Promise<DeleteResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.request<DeleteResult>(
      'DELETE',
      `/v1/memory/${encodeURIComponent(id)}`,
      undefined,
      options
    );
  }

  /**
   * Create a reminder
   *
   * @example
   * ```typescript
   * const reminder = await client.remind({
   *   content: 'Buy coffee',
   *   trigger: 'grocery store'
   * });
   * ```
   */
  async remind(options: RemindOptions): Promise<RemindResult> {
    if (!options.content) {
      throw new ValidationError('Reminder content is required');
    }
    if (!options.trigger) {
      throw new ValidationError('Reminder trigger is required');
    }

    return this.request<RemindResult>('POST', '/v1/remind', {
      content: options.content,
      trigger: options.trigger,
      triggerType: options.triggerType,
      priority: options.priority,
      userId: options.userId,
    });
  }

  /**
   * Get API usage statistics
   *
   * @example
   * ```typescript
   * const usage = await client.getUsage();
   * console.log(`${usage.usage.documentsIndexed} documents indexed`);
   * ```
   */
  async getUsage(options?: { userId?: string }): Promise<UsageResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<UsageResult>('GET', `/v1/usage${query ? `?${query}` : ''}`);
  }
}

/**
 * V7 Enhanced API Client
 * Provides access to chunk-based search, entity extraction, and more
 */
class V7Client {
  private readonly request: RequestMethod;

  constructor(parent: HypersaveClient) {
    // Bind the parent's request method with proper typing
    this.request = (parent as any).request.bind(parent) as RequestMethod;
  }

  /**
   * Enhanced chunk-based search
   *
   * @example
   * ```typescript
   * const results = await client.v7.search('machine learning', { mode: 'deep' });
   * ```
   */
  async search(query: string, options?: Omit<V7SearchOptions, 'query'>): Promise<V7SearchResult> {
    if (!query) {
      throw new ValidationError('Query is required');
    }

    return this.request<V7SearchResult>('POST', '/api/v7/search', {
      query,
      mode: options?.mode,
      sectors: options?.sectors,
      limit: options?.limit,
      userId: options?.userId,
    });
  }

  /**
   * Ask a question with source citations
   *
   * @example
   * ```typescript
   * const result = await client.v7.ask('What is TypeScript?');
   * console.log(result.answer);
   * console.log('Sources:', result.sources);
   * ```
   */
  async ask(question: string, options?: { userId?: string }): Promise<V7AskResult> {
    if (!question) {
      throw new ValidationError('Question is required');
    }

    return this.request<V7AskResult>('POST', '/api/v7/ask', {
      question,
      userId: options?.userId,
    });
  }

  /**
   * Ingest a document with enhanced processing
   *
   * @example
   * ```typescript
   * const result = await client.v7.ingest({
   *   content: 'Long article content...',
   *   title: 'My Article',
   *   type: 'text'
   * });
   * console.log(`Created ${result.chunksCreated} chunks`);
   * ```
   */
  async ingest(options: V7IngestOptions): Promise<V7IngestResult> {
    if (!options.content) {
      throw new ValidationError('Content is required');
    }
    if (!options.title) {
      throw new ValidationError('Title is required');
    }

    return this.request<V7IngestResult>('POST', '/api/v7/ingest', {
      content: options.content,
      title: options.title,
      type: options.type,
      category: options.category,
      sector: options.sector,
      metadata: options.metadata,
      userId: options.userId,
    });
  }

  /**
   * Get extracted entities
   *
   * @example
   * ```typescript
   * const entities = await client.v7.getEntities({ type: 'person' });
   * for (const entity of entities.entities) {
   *   console.log(`${entity.name} (${entity.mentions} mentions)`);
   * }
   * ```
   */
  async getEntities(options?: {
    type?: string;
    limit?: number;
    userId?: string;
  }): Promise<V7EntitiesResult> {
    const params = new URLSearchParams();
    if (options?.type) params.set('type', options.type);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<V7EntitiesResult>('GET', `/api/v7/entities${query ? `?${query}` : ''}`);
  }

  /**
   * Query by entity name
   *
   * @example
   * ```typescript
   * const result = await client.v7.getEntity('Elon Musk');
   * console.log(`Found ${result.documentCount} related documents`);
   * ```
   */
  async getEntity(name: string, options?: { userId?: string }): Promise<V7EntityResult> {
    if (!name) {
      throw new ValidationError('Entity name is required');
    }

    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<V7EntityResult>(
      'GET',
      `/api/v7/entity/${encodeURIComponent(name)}${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get user facts
   *
   * @example
   * ```typescript
   * const facts = await client.v7.getFacts();
   * console.log(`${facts.count} facts stored`);
   * ```
   */
  async getFacts(options?: { userId?: string }): Promise<V7FactsResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.request<V7FactsResult>('GET', `/api/v7/facts${query ? `?${query}` : ''}`);
  }
}

export default HypersaveClient;
