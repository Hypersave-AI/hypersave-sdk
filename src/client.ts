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
  FactsOptions,
  FactsResult,
  RelationsOptions,
  RelationsResult,
  MetricsResult,
  EntitiesOptions,
  EntitiesResult,
  IngestOptions,
  IngestResult,
  SynapsesResult,
  LearnResult,
  RequestOptions,
  ForgetOptions,
  ForgetResult,
  ForgetAllResult,
  ExportResult,
  BrainConsolidateResult,
  BrainContextResult,
  BrainRemindersResult,
  BrainSessionResult,
  FastSearchOptions,
  FastSearchResult,
  RemindersListResult,
  WaypointGraphResult,
  WaypointStatsResult,
  DocumentDetailResult,
  DocumentListResult,
  ForgetLogResult,
  PinResult,
  ReinforceResult,
  PenalizeResult,
  ScheduleForgetResult,
  CleanupFactsOptions,
  CleanupFactsResult,
  ContestFactResult,
  ResolveContestResult,
  CreateOrgResult,
  ListOrgsResult,
  GetOrgResult,
  InviteMemberResult,
  RemoveMemberResult,
  CreateWebhookResult,
  ListWebhooksResult,
  DeleteWebhookResult,
  TestWebhookResult,
  AuditLogOptions,
  AuditLogResult,
} from './types.js';

import {
  HypersaveError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  NetworkError,
  ParseError,
  NotFoundError,
  RateLimitError,
  ServerError,
  createErrorFromStatus,
} from './errors.js';

const DEFAULT_BASE_URL = 'https://api.hypersave.io';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_JITTER_MS = 200;

// Re-export RequestOptions for convenience
export type { RequestOptions };

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
 *
 * // Cancel a request
 * const controller = new AbortController();
 * const promise = client.ask('Long query...', { signal: controller.signal });
 * controller.abort(); // Cancel the request
 * ```
 */
export class HypersaveClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultUserId?: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /** Active abort controllers for cleanup */
  private readonly activeRequests: Map<string, AbortController> = new Map();

  constructor(config: HypersaveConfig) {
    if (!config.apiKey) {
      throw new AuthenticationError('API key is required');
    }

    if (config.apiKey.length < 10) {
      throw new ValidationError('API key appears to be invalid (too short)');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.defaultUserId = config.userId;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelay = config.retryDelay ?? DEFAULT_RETRY_DELAY;
  }

  /**
   * Cancel all active requests
   */
  cancelAll(): void {
    for (const [requestId, controller] of this.activeRequests) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Get count of active requests
   */
  get activeRequestCount(): number {
    return this.activeRequests.size;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add random jitter to prevent thundering herd
   */
  private addJitter(baseDelay: number): number {
    const jitter = Math.random() * MAX_JITTER_MS;
    return baseDelay + jitter;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: unknown): boolean {
    // Don't retry client errors (4xx except 429)
    if (
      error instanceof ValidationError ||
      error instanceof AuthenticationError ||
      error instanceof NotFoundError ||
      error instanceof ParseError
    ) {
      return false;
    }

    // Retry on rate limit, network, server, and timeout errors
    return (
      error instanceof RateLimitError ||
      error instanceof NetworkError ||
      error instanceof ServerError ||
      error instanceof TimeoutError
    );
  }

  /**
   * Calculate backoff delay for retry attempt
   */
  private calculateBackoff(attempt: number, error?: unknown): number {
    // For rate limit errors, use server-provided retry-after if available
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.pow(2, attempt) * this.retryDelay;
    return this.addJitter(baseDelay);
  }

  /**
   * Make an HTTP request to the API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const requestId = options?.requestId || this.generateRequestId();
    const requestTimeout = options?.timeout ?? this.timeout;

    // Create abort controller that combines user signal and timeout
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);

    // Link user-provided signal to our controller
    if (options?.signal) {
      if (options.signal.aborted) {
        this.activeRequests.delete(requestId);
        throw new TimeoutError(0, 'Request was cancelled before it started');
      }
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Request-ID': requestId,
      };

      // Add user ID header if available
      const bodyUserId = body?.userId;
      const userId = options?.userId || (typeof bodyUserId === 'string' ? bodyUserId : undefined) || this.defaultUserId;
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
      this.activeRequests.delete(requestId);

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
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);

      // Type guard for Error objects
      const isError = (e: unknown): e is Error => e instanceof Error;
      const hasName = (e: unknown): e is { name: string } =>
        typeof e === 'object' && e !== null && 'name' in e;

      // Handle abort - distinguish between user cancellation and timeout
      if (hasName(error) && error.name === 'AbortError') {
        if (options?.signal?.aborted) {
          throw new TimeoutError(0, 'Request was cancelled');
        }
        throw new TimeoutError(requestTimeout);
      }

      // Handle network errors
      if (
        hasName(error) &&
        error.name === 'TypeError' &&
        isError(error) &&
        error.message.includes('fetch')
      ) {
        throw new NetworkError('Failed to connect to Hypersave API', error);
      }

      // Re-throw Hypersave errors as-is
      if (error instanceof HypersaveError) {
        throw error;
      }

      // Wrap unknown errors
      const errorMessage = isError(error) ? error.message : 'Unknown error';
      throw new HypersaveError(errorMessage, undefined, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Sleep for a given number of milliseconds (cancellable)
   */
  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new TimeoutError(0, 'Request was cancelled'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new TimeoutError(0, 'Request was cancelled'));
      }, { once: true });
    });
  }

  /**
   * Make an HTTP request with retry logic for transient errors
   */
  private async requestWithRetry<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    options?: RequestOptions
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.request<T>(method, path, body, options);
      } catch (error) {
        lastError = error as Error;

        // Check for user cancellation - don't retry
        if (options?.signal?.aborted) {
          throw error;
        }

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        // Don't sleep after the last attempt
        if (attempt < this.maxRetries - 1) {
          const waitTime = this.calculateBackoff(attempt, error);
          try {
            await this.sleep(waitTime, options?.signal);
          } catch {
            // Cancelled during sleep
            throw error;
          }
        }
      }
    }

    throw lastError;
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
   *
   * // Cancellable save
   * const controller = new AbortController();
   * const promise = client.save({ content: 'Long content...' }, { signal: controller.signal });
   * controller.abort(); // Cancel if needed
   * ```
   */
  async save(options: SaveOptions, requestOptions?: RequestOptions): Promise<SaveResult> {
    if (!options.content) {
      throw new ValidationError('Content is required');
    }

    if (typeof options.content !== 'string') {
      throw new ValidationError('Content must be a string');
    }

    return this.requestWithRetry<SaveResult>('POST', '/v1/save', {
      content: options.content,
      title: options.title,
      type: options.type,
      category: options.category,
      async: options.async !== false, // Default to async
      userId: options.userId,
    }, {
      ...requestOptions,
      userId: requestOptions?.userId ?? options.userId,
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
  async saveSync(options: Omit<SaveOptions, 'async'>, requestOptions?: RequestOptions): Promise<SaveResult> {
    return this.save({ ...options, async: false }, requestOptions);
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
  async getSaveStatus(pendingId: string, requestOptions?: RequestOptions): Promise<SaveStatus> {
    if (!pendingId) {
      throw new ValidationError('Pending ID is required');
    }

    if (typeof pendingId !== 'string') {
      throw new ValidationError('Pending ID must be a string');
    }

    return this.requestWithRetry<SaveStatus>('GET', `/v1/save/status/${encodeURIComponent(pendingId)}`, undefined, requestOptions);
  }

  /**
   * Ask a question and get a verified answer from your memories
   *
   * @example
   * ```typescript
   * const result = await client.ask('What did I learn about TypeScript?');
   * console.log(result.answer);
   * console.log(`Confidence: ${result.confidence}`);
   *
   * // With cancellation
   * const controller = new AbortController();
   * setTimeout(() => controller.abort(), 5000); // Cancel after 5s
   * const result = await client.ask('Complex query...', { signal: controller.signal });
   * ```
   */
  async ask(query: string, options?: RequestOptions & { userId?: string }): Promise<AskResult> {
    if (!query) {
      throw new ValidationError('Query is required');
    }

    if (typeof query !== 'string') {
      throw new ValidationError('Query must be a string');
    }

    if (query.length > 10000) {
      throw new ValidationError('Query exceeds maximum length of 10000 characters');
    }

    return this.requestWithRetry<AskResult>('POST', '/v1/ask', {
      query,
      userId: options?.userId,
    }, options);
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
  async search(query: string, options?: Omit<SearchOptions, 'query'> & RequestOptions): Promise<SearchResult> {
    if (!query) {
      throw new ValidationError('Query is required');
    }

    if (typeof query !== 'string') {
      throw new ValidationError('Query must be a string');
    }

    return this.requestWithRetry<SearchResult>('POST', '/v1/search', {
      query,
      includeContext: options?.includeContext,
      limit: options?.limit,
      userId: options?.userId,
    }, options);
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
  async query(message: string, options?: Omit<QueryOptions, 'message'> & RequestOptions): Promise<QueryResult> {
    if (!message) {
      throw new ValidationError('Message is required');
    }

    if (typeof message !== 'string') {
      throw new ValidationError('Message must be a string');
    }

    return this.requestWithRetry<QueryResult>('POST', '/v1/query', {
      message,
      skipMemory: options?.skipMemory,
      limit: options?.limit,
      userId: options?.userId,
    }, options);
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
  async getMemories(options?: GetMemoriesOptions & RequestOptions): Promise<MemoriesResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<MemoriesResult>('GET', `/v1/memories${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Get your user profile built from facts
   *
   * @example
   * ```typescript
   * // Get full profile
   * const profile = await client.getProfile();
   * console.log(profile.profile);
   *
   * // Get only work-related facts
   * const workProfile = await client.getProfile({ section: 'work' });
   * console.log(workProfile.facts);
   * ```
   */
  async getProfile(options?: RequestOptions & {
    userId?: string;
    /** Filter to specific section: identity, work, health, preference, etc. */
    section?: string;
  }): Promise<ProfileResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);
    if (options?.section) params.set('section', options.section);

    const query = params.toString();
    return this.requestWithRetry<ProfileResult>('GET', `/v1/profile${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Get your knowledge graph
   *
   * @example
   * ```typescript
   * // Get full graph
   * const graph = await client.getGraph();
   * console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
   *
   * // Get graph filtered to specific entity
   * const johnGraph = await client.getGraph({ entity: 'John' });
   *
   * // Get 2-hop subgraph around entity
   * const subgraph = await client.getGraph({ entity: 'John', depth: 2 });
   * ```
   */
  async getGraph(options?: RequestOptions & {
    userId?: string;
    /** Filter to triplets mentioning this entity */
    entity?: string;
    /** Depth for multi-hop traversal (default: 1) */
    depth?: number;
    /** Starting entity for path finding */
    startEntity?: string;
    /** Target entity for path finding */
    endEntity?: string;
    /** Center entity for subgraph extraction */
    centerEntity?: string;
  }): Promise<GraphResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);
    if (options?.entity) params.set('entity', options.entity);
    if (options?.depth) params.set('depth', options.depth.toString());
    if (options?.startEntity) params.set('startEntity', options.startEntity);
    if (options?.endEntity) params.set('endEntity', options.endEntity);
    if (options?.centerEntity) params.set('centerEntity', options.centerEntity);

    const query = params.toString();
    return this.requestWithRetry<GraphResult>('GET', `/v1/graph${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Delete a memory by ID
   *
   * @example
   * ```typescript
   * await client.deleteMemory('doc-123');
   * ```
   */
  async deleteMemory(id: string, options?: RequestOptions & { userId?: string }): Promise<DeleteResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    if (typeof id !== 'string') {
      throw new ValidationError('Memory ID must be a string');
    }

    return this.requestWithRetry<DeleteResult>(
      'DELETE',
      `/v1/memories/${encodeURIComponent(id)}`,
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
  async remind(options: RemindOptions, requestOptions?: RequestOptions): Promise<RemindResult> {
    if (!options.content) {
      throw new ValidationError('Reminder content is required');
    }
    if (!options.trigger) {
      throw new ValidationError('Reminder trigger is required');
    }

    if (typeof options.content !== 'string') {
      throw new ValidationError('Reminder content must be a string');
    }

    if (typeof options.trigger !== 'string') {
      throw new ValidationError('Reminder trigger must be a string');
    }

    return this.requestWithRetry<RemindResult>('POST', '/v1/remind', {
      content: options.content,
      trigger: options.trigger,
      triggerType: options.triggerType,
      priority: options.priority,
      userId: options.userId,
    }, {
      ...requestOptions,
      userId: requestOptions?.userId ?? options.userId,
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
  async getUsage(options?: RequestOptions & { userId?: string }): Promise<UsageResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<UsageResult>('GET', `/v1/usage${query ? `?${query}` : ''}`, undefined, options);
  }

  // ============================================================================
  // FACTS & RELATIONS METHODS
  // ============================================================================

  /**
   * Get extracted facts for a user
   *
   * @example
   * ```typescript
   * const facts = await client.getFacts({ category: 'work' });
   * console.log(`${facts.count} work-related facts`);
   * for (const fact of facts.facts) {
   *   console.log(`${fact.key}: ${fact.value}`);
   * }
   * ```
   */
  async getFacts(options?: FactsOptions & RequestOptions): Promise<FactsResult> {
    const params = new URLSearchParams();
    if (options?.category) params.set('category', options.category);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<FactsResult>('GET', `/v1/facts${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Get fact relations and knowledge triplets
   *
   * @example
   * ```typescript
   * const relations = await client.getRelations();
   * console.log(`${relations.counts.factRelations} relations`);
   * console.log(`${relations.counts.triplets} triplets`);
   * for (const triplet of relations.knowledgeTriplets) {
   *   console.log(`${triplet.subject} ${triplet.predicate} ${triplet.object}`);
   * }
   * ```
   */
  async getRelations(options?: RelationsOptions & RequestOptions): Promise<RelationsResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<RelationsResult>('GET', `/v1/relations${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Get API performance metrics
   *
   * @example
   * ```typescript
   * const metrics = await client.getMetrics();
   * console.log(`Ask P95 latency: ${metrics.ask.latency.p95}ms`);
   * console.log(`Cache hit rate: ${metrics.cache.hitRate}`);
   * ```
   */
  async getMetrics(requestOptions?: RequestOptions): Promise<MetricsResult> {
    return this.requestWithRetry<MetricsResult>('GET', '/v1/metrics', undefined, requestOptions);
  }

  /**
   * Get extracted entities (people, places, organizations, etc.)
   *
   * @example
   * ```typescript
   * const entities = await client.getEntities();
   * console.log(`${entities.count} entities found`);
   * for (const entity of entities.entities) {
   *   console.log(`${entity.name} (${entity.type}) - ${entity.mentions} mentions`);
   * }
   * ```
   */
  async getEntities(options?: EntitiesOptions & RequestOptions): Promise<EntitiesResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<EntitiesResult>('GET', `/v1/entities${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Enhanced document ingestion with full processing
   *
   * @example
   * ```typescript
   * const result = await client.ingest({
   *   content: 'Meeting notes from Q4 planning...',
   *   title: 'Q4 Planning Meeting',
   *   category: 'Work',
   *   sector: 'episodic'
   * });
   * console.log(`Document ${result.documentId}: ${result.facts} facts, ${result.entities} entities`);
   * ```
   */
  async ingest(options: IngestOptions, requestOptions?: RequestOptions): Promise<IngestResult> {
    if (!options.content) {
      throw new ValidationError('Content is required');
    }
    if (!options.title) {
      throw new ValidationError('Title is required');
    }

    if (typeof options.content !== 'string') {
      throw new ValidationError('Content must be a string');
    }

    if (typeof options.title !== 'string') {
      throw new ValidationError('Title must be a string');
    }

    return this.requestWithRetry<IngestResult>('POST', '/v1/ingest', {
      content: options.content,
      title: options.title,
      type: options.type,
      category: options.category,
      sector: options.sector,
      metadata: options.metadata,
      userId: options.userId,
    }, {
      ...requestOptions,
      userId: requestOptions?.userId ?? options.userId,
    });
  }

  /**
   * Get learned behavioral patterns (synapses)
   *
   * Synapses are automatically extracted patterns from your conversations,
   * including communication style, decision-making preferences, and work habits.
   *
   * @example
   * ```typescript
   * const synapses = await client.getSynapses();
   * console.log(`${synapses.count} learned patterns`);
   * for (const synapse of synapses.synapses) {
   *   console.log(`${synapse.pattern_type}: ${synapse.description}`);
   * }
   * ```
   */
  async getSynapses(options?: RequestOptions & { userId?: string }): Promise<SynapsesResult> {
    const params = new URLSearchParams();
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<SynapsesResult>('GET', `/v1/synapses${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Trigger synapse learning from recent interactions
   *
   * @example
   * ```typescript
   * const result = await client.triggerLearning({ lookbackDays: 30 });
   * console.log(`New: ${result.newSynapses}, Updated: ${result.updatedSynapses}`);
   * ```
   */
  async triggerLearning(options?: { lookbackDays?: number } & RequestOptions): Promise<LearnResult> {
    const lookbackDays = options?.lookbackDays ?? 30;

    if (typeof lookbackDays !== 'number' || lookbackDays < 1 || lookbackDays > 365) {
      throw new ValidationError('lookbackDays must be a number between 1 and 365');
    }

    return this.requestWithRetry<LearnResult>('POST', '/v1/synapses/learn', {
      lookbackDays,
    }, options);
  }

  // ============================================================================
  // FORGET METHODS (GDPR)
  // ============================================================================

  /**
   * Forget memories matching a content query (GDPR right to be forgotten)
   *
   * @example
   * ```typescript
   * const result = await client.forget({ query: 'sensitive information' });
   * console.log(`Forgot ${result.forgotten?.total} items`);
   * ```
   */
  async forget(options: ForgetOptions, requestOptions?: RequestOptions): Promise<ForgetResult> {
    if (!options.query) {
      throw new ValidationError('Query is required');
    }

    return this.requestWithRetry<ForgetResult>('POST', '/v1/forget', {
      query: options.query,
      reason: options.reason,
    }, requestOptions);
  }

  /**
   * Erase all user data (GDPR Article 17 - Right to Erasure)
   *
   * WARNING: This cannot be undone. Requires confirmation string.
   *
   * @example
   * ```typescript
   * const result = await client.forgetAll({ hardDelete: true });
   * console.log(result.message);
   * ```
   */
  async forgetAll(options?: {
    /** Set to true for permanent deletion (default: soft delete) */
    hardDelete?: boolean;
    /** Reason for erasure */
    reason?: string;
  } & RequestOptions): Promise<ForgetAllResult> {
    return this.requestWithRetry<ForgetAllResult>('POST', '/v1/forget/all', {
      confirm: 'DELETE_ALL_MY_DATA',
      hardDelete: options?.hardDelete ?? false,
      reason: options?.reason,
    }, options);
  }

  /**
   * Get the forgetting audit log
   *
   * @example
   * ```typescript
   * const log = await client.getForgetLog({ limit: 20 });
   * console.log(`${log.count} log entries`);
   * ```
   */
  async getForgetLog(options?: { limit?: number } & RequestOptions): Promise<ForgetLogResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    return this.requestWithRetry<ForgetLogResult>('GET', `/v1/forget/log${query ? `?${query}` : ''}`, undefined, options);
  }

  // ============================================================================
  // EXPORT METHODS (GDPR)
  // ============================================================================

  /**
   * Export all user data in portable format (GDPR Article 20)
   *
   * @example
   * ```typescript
   * const exported = await client.exportData();
   * console.log(JSON.stringify(exported.data));
   * ```
   */
  async exportData(requestOptions?: RequestOptions): Promise<ExportResult> {
    return this.requestWithRetry<ExportResult>('GET', '/v1/export', undefined, requestOptions);
  }

  // ============================================================================
  // BRAIN METHODS
  // ============================================================================

  /**
   * Run memory consolidation (merges duplicate facts)
   *
   * @example
   * ```typescript
   * const result = await client.brainConsolidate();
   * console.log(`Consolidated ${result.consolidated} items`);
   * ```
   */
  async brainConsolidate(requestOptions?: RequestOptions): Promise<BrainConsolidateResult> {
    return this.requestWithRetry<BrainConsolidateResult>('POST', '/v1/brain/consolidate', {}, requestOptions);
  }

  /**
   * Get current user context (time, mode, focus, recent topics)
   *
   * @example
   * ```typescript
   * const ctx = await client.brainContext();
   * console.log(`Mode: ${ctx.context?.inferredMode}`);
   * ```
   */
  async brainContext(requestOptions?: RequestOptions): Promise<BrainContextResult> {
    return this.requestWithRetry<BrainContextResult>('GET', '/v1/brain/context', undefined, requestOptions);
  }

  /**
   * Get active brain reminders (prospective memory)
   *
   * @example
   * ```typescript
   * const result = await client.brainReminders();
   * console.log(`${result.count} active reminders`);
   * ```
   */
  async brainReminders(requestOptions?: RequestOptions): Promise<BrainRemindersResult> {
    return this.requestWithRetry<BrainRemindersResult>('GET', '/v1/brain/reminders', undefined, requestOptions);
  }

  /**
   * Start a working memory session
   *
   * @example
   * ```typescript
   * const session = await client.brainSessionStart({ taskContext: 'Code review' });
   * console.log(`Session: ${session.sessionId}`);
   * ```
   */
  async brainSessionStart(options?: {
    /** Context for the working memory session */
    taskContext?: string;
  } & RequestOptions): Promise<BrainSessionResult> {
    return this.requestWithRetry<BrainSessionResult>('POST', '/v1/brain/session/start', {
      taskContext: options?.taskContext,
    }, options);
  }

  /**
   * Get current working memory session
   *
   * @example
   * ```typescript
   * const session = await client.brainSessionCurrent();
   * console.log(session.session);
   * ```
   */
  async brainSessionCurrent(requestOptions?: RequestOptions): Promise<BrainSessionResult> {
    return this.requestWithRetry<BrainSessionResult>('GET', '/v1/brain/session/current', undefined, requestOptions);
  }

  /**
   * Detect contradictions in user's stored facts
   *
   * @example
   * ```typescript
   * const result = await client.detectContradictions();
   * if (result.hasContradictions) {
   *   for (const c of result.contradictions) {
   *     console.log(`${c.key}: "${c.previousValue}" -> "${c.currentValue}"`);
   *   }
   * }
   * ```
   */
  async detectContradictions(options?: {
    /** Check contradiction for a specific fact key */
    factKey?: string;
    /** Fact value to check against */
    factValue?: string;
    /** Maximum contradictions to return */
    limit?: number;
  } & RequestOptions): Promise<{
    success: boolean;
    hasContradictions: boolean;
    count: number;
    contradictions: Array<{
      key: string;
      currentValue: string;
      previousValue: string;
      category?: string;
    }>;
    error?: string;
  }> {
    return this.requestWithRetry('POST', '/v1/brain/contradictions/detect', {
      factKey: options?.factKey,
      factValue: options?.factValue,
      limit: options?.limit,
    }, options);
  }

  // ============================================================================
  // ANALYZE METHODS
  // ============================================================================

  /**
   * Analyze content (auto-detects text, URL, or YouTube)
   *
   * @example
   * ```typescript
   * const result = await client.analyze({ input: 'https://example.com/article' });
   * console.log(`${result.title} - ${result.category}`);
   * console.log(`Tags: ${result.tags?.join(', ')}`);
   * ```
   */
  async analyze(options: { input: string; includeRawContent?: boolean }, requestOptions?: RequestOptions): Promise<{
    success: boolean;
    id: string;
    type?: string;
    title?: string;
    summary?: string;
    category?: string;
    tags?: string[];
    sector?: { primary: string; scores: Record<string, number> };
    entities?: Array<{ name: string; type: string }>;
    keyPoints?: string[];
    error?: string;
  }> {
    if (!options.input) {
      throw new ValidationError('Input is required');
    }

    return this.requestWithRetry('POST', '/v1/analyze', {
      input: options.input,
      options: options.includeRawContent ? { includeRawContent: true } : undefined,
    }, requestOptions);
  }

  // ============================================================================
  // FAST SEARCH METHODS
  // ============================================================================

  /**
   * Hypersave-Fast: sub-second hybrid search (vector + keyword)
   *
   * @example
   * ```typescript
   * const results = await client.fastSearch({ query: 'machine learning', limit: 10 });
   * for (const r of results.results ?? []) {
   *   console.log(`[${r.score}] ${r.content}`);
   * }
   * ```
   */
  async fastSearch(options: FastSearchOptions, requestOptions?: RequestOptions): Promise<FastSearchResult> {
    if (!options.query) {
      throw new ValidationError('Query is required');
    }

    return this.requestWithRetry<FastSearchResult>('POST', '/v1/fast/search', {
      query: options.query,
      limit: options.limit,
      userId: options.userId,
    }, {
      ...requestOptions,
      userId: requestOptions?.userId ?? options.userId,
    });
  }

  // ============================================================================
  // REMINDER LIST METHODS
  // ============================================================================

  /**
   * Get all reminders for the user
   *
   * @example
   * ```typescript
   * const result = await client.getReminders();
   * console.log(`${result.reminders?.total} active reminders`);
   * for (const r of result.reminders?.active ?? []) {
   *   console.log(`${r.content} (trigger: ${r.triggerValue})`);
   * }
   * ```
   */
  async getReminders(options?: {
    /** Include already-triggered reminders */
    includeTriggered?: boolean;
    /** Include proactive suggestions (default: true) */
    includeSuggestions?: boolean;
  } & RequestOptions): Promise<RemindersListResult> {
    const params = new URLSearchParams();
    if (options?.includeTriggered) params.set('includeTriggered', 'true');
    if (options?.includeSuggestions === false) params.set('includeSuggestions', 'false');
    if (options?.userId) params.set('userId', options.userId);

    const query = params.toString();
    return this.requestWithRetry<RemindersListResult>('GET', `/v1/remind${query ? `?${query}` : ''}`, undefined, options);
  }

  // ============================================================================
  // WAYPOINT METHODS
  // ============================================================================

  /**
   * Get the waypoint graph (document connections)
   *
   * @example
   * ```typescript
   * const graph = await client.getWaypointGraph();
   * console.log(`${graph.nodes?.length} nodes, ${graph.edges?.length} edges`);
   * ```
   */
  async getWaypointGraph(options?: {
    /** Maximum items to return (default: 500) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
  } & RequestOptions): Promise<WaypointGraphResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.requestWithRetry<WaypointGraphResult>('GET', `/v1/waypoints/graph${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Get waypoint statistics
   *
   * @example
   * ```typescript
   * const stats = await client.getWaypointStats();
   * console.log(stats.stats);
   * ```
   */
  async getWaypointStats(requestOptions?: RequestOptions): Promise<WaypointStatsResult> {
    return this.requestWithRetry<WaypointStatsResult>('GET', '/v1/waypoints/stats', undefined, requestOptions);
  }

  /**
   * Rebuild waypoint connections between recent documents
   *
   * @example
   * ```typescript
   * const result = await client.rebuildWaypoints({ threshold: 0.8, limit: 50 });
   * console.log(`Processed ${result.documentsProcessed} docs, created ${result.waypointsCreated} waypoints`);
   * ```
   */
  async rebuildWaypoints(options?: {
    /** Similarity threshold (0-1, default: 0.75) */
    threshold?: number;
    /** Maximum documents to process (default: 50, max: 100) */
    limit?: number;
  } & RequestOptions): Promise<{
    success: boolean;
    documentsProcessed: number;
    waypointsCreated: number;
    error?: string;
  }> {
    return this.requestWithRetry('POST', '/v1/waypoints/rebuild', {
      threshold: options?.threshold,
      limit: options?.limit,
    }, options);
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT METHODS
  // ============================================================================

  /**
   * Get a document by ID
   *
   * @example
   * ```typescript
   * const doc = await client.getDocument('doc-123');
   * console.log(doc.document?.analysis);
   * ```
   */
  async getDocument(id: string, requestOptions?: RequestOptions): Promise<DocumentDetailResult> {
    if (!id) {
      throw new ValidationError('Document ID is required');
    }

    return this.requestWithRetry<DocumentDetailResult>(
      'GET',
      `/v1/documents/${encodeURIComponent(id)}`,
      undefined,
      requestOptions
    );
  }

  /**
   * List documents with pagination
   *
   * @example
   * ```typescript
   * const docs = await client.getDocuments({ limit: 20 });
   * console.log(`${docs.total} total, showing ${docs.documents?.length}`);
   * ```
   */
  async getDocuments(options?: {
    /** Maximum documents to return (default: 50, max: 100) */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
  } & RequestOptions): Promise<DocumentListResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.requestWithRetry<DocumentListResult>('GET', `/v1/documents${query ? `?${query}` : ''}`, undefined, options);
  }

  /**
   * Delete a document by ID
   *
   * @example
   * ```typescript
   * await client.deleteDocument('doc-123');
   * ```
   */
  async deleteDocument(id: string, requestOptions?: RequestOptions): Promise<DeleteResult> {
    if (!id) {
      throw new ValidationError('Document ID is required');
    }

    return this.requestWithRetry<DeleteResult>(
      'DELETE',
      `/v1/documents/${encodeURIComponent(id)}`,
      undefined,
      requestOptions
    );
  }

  // ============================================================================
  // MEMORY MANAGEMENT METHODS (pin, reinforce, penalize, schedule-forget)
  // ============================================================================

  /**
   * Forget a specific memory by ID (GDPR-compliant soft deletion)
   *
   * @example
   * ```typescript
   * const result = await client.forgetMemory('doc-123', { reason: 'User request' });
   * console.log(result.message); // 'Memory forgotten'
   * ```
   */
  async forgetMemory(id: string, options?: {
    /** Whether to cascade-delete related chunks and facts (default: true) */
    cascade?: boolean;
    /** Reason for the audit log */
    reason?: string;
  } & RequestOptions): Promise<DeleteResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.requestWithRetry<DeleteResult>(
      'DELETE',
      `/v1/memories/${encodeURIComponent(id)}`,
      {
        cascade: options?.cascade,
        reason: options?.reason,
      },
      options,
    );
  }

  /**
   * Pin a memory so it never decays (salience stays at 1.0)
   *
   * @example
   * ```typescript
   * const result = await client.pinMemory('fact-123');
   * console.log(result.message); // 'Memory pinned'
   * ```
   */
  async pinMemory(id: string, requestOptions?: RequestOptions): Promise<PinResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.requestWithRetry<PinResult>(
      'POST',
      `/v1/memories/${encodeURIComponent(id)}/pin`,
      {},
      requestOptions,
    );
  }

  /**
   * Unpin a memory so it decays normally again
   *
   * @example
   * ```typescript
   * const result = await client.unpinMemory('fact-123');
   * console.log(result.message); // 'Memory unpinned'
   * ```
   */
  async unpinMemory(id: string, requestOptions?: RequestOptions): Promise<PinResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.requestWithRetry<PinResult>(
      'POST',
      `/v1/memories/${encodeURIComponent(id)}/unpin`,
      {},
      requestOptions,
    );
  }

  /**
   * Reinforce a memory's salience (mark as important)
   *
   * @example
   * ```typescript
   * const result = await client.reinforceMemory('fact-123', 0.3);
   * console.log(`Salience: ${result.oldSalience} -> ${result.newSalience}`);
   * ```
   */
  async reinforceMemory(id: string, gain?: number, requestOptions?: RequestOptions): Promise<ReinforceResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.requestWithRetry<ReinforceResult>(
      'POST',
      `/v1/memories/${encodeURIComponent(id)}/reinforce`,
      { gain },
      requestOptions,
    );
  }

  /**
   * Penalize a memory's salience (mark as less important)
   *
   * @example
   * ```typescript
   * const result = await client.penalizeMemory('fact-123', 0.2);
   * console.log(`Salience: ${result.oldSalience} -> ${result.newSalience}`);
   * ```
   */
  async penalizeMemory(id: string, amount?: number, requestOptions?: RequestOptions): Promise<PenalizeResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }

    return this.requestWithRetry<PenalizeResult>(
      'POST',
      `/v1/memories/${encodeURIComponent(id)}/penalize`,
      { amount },
      requestOptions,
    );
  }

  /**
   * Schedule a memory to be automatically forgotten at a future date
   *
   * @example
   * ```typescript
   * const result = await client.scheduleForget('doc-123', '2025-01-01T00:00:00Z', 'Temporary data');
   * console.log(`Will forget at: ${result.scheduledFor}`);
   * ```
   */
  async scheduleForget(id: string, forgetAt: string | Date, reason?: string, requestOptions?: RequestOptions): Promise<ScheduleForgetResult> {
    if (!id) {
      throw new ValidationError('Memory ID is required');
    }
    if (!forgetAt) {
      throw new ValidationError('forgetAt is required');
    }

    const forgetAtStr = forgetAt instanceof Date ? forgetAt.toISOString() : forgetAt;

    return this.requestWithRetry<ScheduleForgetResult>(
      'POST',
      `/v1/memories/${encodeURIComponent(id)}/schedule-forget`,
      { forgetAt: forgetAtStr, reason },
      requestOptions,
    );
  }

  // ============================================================================
  // FACTS MANAGEMENT METHODS (cleanup, contest)
  // ============================================================================

  /**
   * Clean up duplicate and problematic facts
   *
   * @example
   * ```typescript
   * // Dry run first to see what would be deleted
   * const preview = await client.cleanupFacts({ dryRun: true });
   * console.log(`Would delete ${preview.summary?.toDelete} facts`);
   *
   * // Then actually delete
   * const result = await client.cleanupFacts({ dryRun: false });
   * console.log(`Deleted ${result.summary?.deleted} facts`);
   * ```
   */
  async cleanupFacts(options?: CleanupFactsOptions & RequestOptions): Promise<CleanupFactsResult> {
    return this.requestWithRetry<CleanupFactsResult>('POST', '/v1/facts/cleanup', {
      deduplicate: options?.deduplicate,
      removeAttributed: options?.removeAttributed,
      minConfidence: options?.minConfidence,
      dryRun: options?.dryRun,
    }, options);
  }

  /**
   * Contest a fact (mark as disputed)
   *
   * @example
   * ```typescript
   * const result = await client.contestFact('fact-123', 'This is outdated');
   * console.log(result.message); // 'Fact contested successfully'
   * ```
   */
  async contestFact(id: string, reason: string, conflictingFactId?: string, requestOptions?: RequestOptions): Promise<ContestFactResult> {
    if (!id) {
      throw new ValidationError('Fact ID is required');
    }
    if (!reason) {
      throw new ValidationError('Reason is required');
    }

    return this.requestWithRetry<ContestFactResult>(
      'POST',
      `/v1/facts/${encodeURIComponent(id)}/contest`,
      { reason, conflictingFactId },
      requestOptions,
    );
  }

  /**
   * Resolve a contested fact (clear disputed status)
   *
   * @example
   * ```typescript
   * const result = await client.resolveContest('fact-123');
   * console.log(result.message); // 'Contest resolved successfully'
   * ```
   */
  async resolveContest(id: string, requestOptions?: RequestOptions): Promise<ResolveContestResult> {
    if (!id) {
      throw new ValidationError('Fact ID is required');
    }

    return this.requestWithRetry<ResolveContestResult>(
      'POST',
      `/v1/facts/${encodeURIComponent(id)}/resolve-contest`,
      {},
      requestOptions,
    );
  }

  // ============================================================================
  // ORGANIZATION METHODS (enterprise multi-tenancy)
  // ============================================================================

  /**
   * Create a new organization
   *
   * @example
   * ```typescript
   * const result = await client.createOrg('Acme Inc', 'acme-inc');
   * console.log(`Org created: ${result.data?.org.id}`);
   * ```
   */
  async createOrg(name: string, slug: string, requestOptions?: RequestOptions): Promise<CreateOrgResult> {
    if (!name) {
      throw new ValidationError('Organization name is required');
    }
    if (!slug) {
      throw new ValidationError('Organization slug is required');
    }

    return this.requestWithRetry<CreateOrgResult>('POST', '/v1/org', {
      name,
      slug,
    }, requestOptions);
  }

  /**
   * List organizations the current user belongs to
   *
   * @example
   * ```typescript
   * const result = await client.getOrgs();
   * for (const org of result.data?.organizations ?? []) {
   *   console.log(`${org.name} (${org.role})`);
   * }
   * ```
   */
  async getOrgs(requestOptions?: RequestOptions): Promise<ListOrgsResult> {
    return this.requestWithRetry<ListOrgsResult>('GET', '/v1/org', undefined, requestOptions);
  }

  /**
   * Get organization details including members
   *
   * @example
   * ```typescript
   * const result = await client.getOrg('org-123');
   * console.log(`${result.data?.org.name}: ${result.data?.memberCount} members`);
   * ```
   */
  async getOrg(orgId: string, requestOptions?: RequestOptions): Promise<GetOrgResult> {
    if (!orgId) {
      throw new ValidationError('Organization ID is required');
    }

    return this.requestWithRetry<GetOrgResult>(
      'GET',
      `/v1/org/${encodeURIComponent(orgId)}`,
      undefined,
      requestOptions,
    );
  }

  /**
   * Invite a member to an organization
   *
   * @example
   * ```typescript
   * const result = await client.inviteMember('org-123', 'user-456', 'member');
   * console.log(result.message); // 'Member added with role "member"'
   * ```
   */
  async inviteMember(orgId: string, userId: string, role: 'admin' | 'member' | 'viewer', requestOptions?: RequestOptions): Promise<InviteMemberResult> {
    if (!orgId) {
      throw new ValidationError('Organization ID is required');
    }
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    if (!role) {
      throw new ValidationError('Role is required');
    }

    return this.requestWithRetry<InviteMemberResult>(
      'POST',
      `/v1/org/${encodeURIComponent(orgId)}/members`,
      { userId, role },
      requestOptions,
    );
  }

  /**
   * Remove a member from an organization
   *
   * @example
   * ```typescript
   * await client.removeMember('org-123', 'user-456');
   * ```
   */
  async removeMember(orgId: string, memberId: string, requestOptions?: RequestOptions): Promise<RemoveMemberResult> {
    if (!orgId) {
      throw new ValidationError('Organization ID is required');
    }
    if (!memberId) {
      throw new ValidationError('Member ID is required');
    }

    return this.requestWithRetry<RemoveMemberResult>(
      'DELETE',
      `/v1/org/${encodeURIComponent(orgId)}/members/${encodeURIComponent(memberId)}`,
      undefined,
      requestOptions,
    );
  }

  // ============================================================================
  // WEBHOOK METHODS
  // ============================================================================

  /**
   * Register a new webhook endpoint
   *
   * @example
   * ```typescript
   * const result = await client.createWebhook('https://example.com/webhook', ['save.completed', 'memory.forgotten']);
   * console.log(`Webhook ID: ${result.endpoint?.id}`);
   * console.log(`Secret: ${result.secret}`); // Store securely, shown only once
   * ```
   */
  async createWebhook(url: string, events: string[], description?: string, requestOptions?: RequestOptions): Promise<CreateWebhookResult> {
    if (!url) {
      throw new ValidationError('Webhook URL is required');
    }
    if (!events || events.length === 0) {
      throw new ValidationError('At least one event type is required');
    }

    return this.requestWithRetry<CreateWebhookResult>('POST', '/v1/webhooks', {
      url,
      events,
      description,
    }, requestOptions);
  }

  /**
   * List registered webhook endpoints
   *
   * @example
   * ```typescript
   * const result = await client.listWebhooks();
   * for (const ep of result.endpoints ?? []) {
   *   console.log(`${ep.url} -> ${ep.events.join(', ')}`);
   * }
   * ```
   */
  async listWebhooks(requestOptions?: RequestOptions): Promise<ListWebhooksResult> {
    return this.requestWithRetry<ListWebhooksResult>('GET', '/v1/webhooks', undefined, requestOptions);
  }

  /**
   * Delete a webhook endpoint
   *
   * @example
   * ```typescript
   * await client.deleteWebhook('webhook-123');
   * ```
   */
  async deleteWebhook(id: string, requestOptions?: RequestOptions): Promise<DeleteWebhookResult> {
    if (!id) {
      throw new ValidationError('Webhook ID is required');
    }

    return this.requestWithRetry<DeleteWebhookResult>(
      'DELETE',
      `/v1/webhooks/${encodeURIComponent(id)}`,
      undefined,
      requestOptions,
    );
  }

  /**
   * Send a test event to a webhook endpoint
   *
   * @example
   * ```typescript
   * const result = await client.testWebhook('webhook-123');
   * console.log(result.message);
   * ```
   */
  async testWebhook(id: string, requestOptions?: RequestOptions): Promise<TestWebhookResult> {
    if (!id) {
      throw new ValidationError('Webhook ID is required');
    }

    return this.requestWithRetry<TestWebhookResult>(
      'POST',
      `/v1/webhooks/${encodeURIComponent(id)}/test`,
      {},
      requestOptions,
    );
  }

  // ============================================================================
  // AUDIT LOG METHODS (SOC 2 / HIPAA compliance)
  // ============================================================================

  /**
   * Get audit logs for the current user
   *
   * @example
   * ```typescript
   * const result = await client.getAuditLogs({ action: 'delete', limit: 50 });
   * for (const entry of result.data ?? []) {
   *   console.log(`${entry.action} on ${entry.resourceType}/${entry.resourceId}`);
   * }
   * ```
   */
  async getAuditLogs(options?: AuditLogOptions & RequestOptions): Promise<AuditLogResult> {
    const params = new URLSearchParams();
    if (options?.action) params.set('action', options.action);
    if (options?.resource) params.set('resource', options.resource);
    if (options?.start) params.set('start', String(options.start));
    if (options?.end) params.set('end', String(options.end));
    if (options?.limit) params.set('limit', String(options.limit));

    const query = params.toString();
    return this.requestWithRetry<AuditLogResult>(
      'GET',
      `/v1/audit${query ? `?${query}` : ''}`,
      undefined,
      options,
    );
  }

  /**
   * Export audit logs as JSON or CSV
   *
   * Note: CSV export returns raw text, not JSON. For CSV, use the raw fetch
   * approach or call this method which returns the JSON-wrapped response.
   *
   * @example
   * ```typescript
   * const result = await client.exportAuditLogs('json');
   * ```
   */
  async exportAuditLogs(format?: 'json' | 'csv', dateRange?: { start: number; end: number }, requestOptions?: RequestOptions): Promise<ExportResult> {
    const params = new URLSearchParams();
    if (format) params.set('format', format);
    if (dateRange?.start) params.set('start', String(dateRange.start));
    if (dateRange?.end) params.set('end', String(dateRange.end));

    const query = params.toString();
    return this.requestWithRetry<ExportResult>(
      'GET',
      `/v1/audit/export${query ? `?${query}` : ''}`,
      undefined,
      requestOptions,
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Wait for an async save operation to complete
   *
   * @example
   * ```typescript
   * const save = await client.save({ content: 'Long article...' });
   * if (save.pendingId) {
   *   const status = await client.waitForSave(save.pendingId, {
   *     pollInterval: 1000,
   *     maxWait: 60000
   *   });
   *   console.log(`Save completed with status: ${status.status}`);
   * }
   * ```
   */
  async waitForSave(
    pendingId: string,
    options?: {
      /** Polling interval in ms (default: 1000) */
      pollInterval?: number;
      /** Maximum wait time in ms (default: 60000) */
      maxWait?: number;
      /** AbortSignal for cancellation */
      signal?: AbortSignal;
    }
  ): Promise<SaveStatus> {
    const pollInterval = options?.pollInterval ?? 1000;
    const maxWait = options?.maxWait ?? 60000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (options?.signal?.aborted) {
        throw new TimeoutError(0, 'Polling was cancelled');
      }

      const status = await this.getSaveStatus(pendingId, { signal: options?.signal });

      if (status.status === 'complete' || status.status === 'error') {
        return status;
      }

      await this.sleep(pollInterval, options?.signal);
    }

    throw new TimeoutError(maxWait, `Save operation did not complete within ${maxWait}ms`);
  }

  /**
   * Batch save multiple pieces of content
   *
   * @example
   * ```typescript
   * const results = await client.batchSave([
   *   { content: 'Note 1' },
   *   { content: 'Note 2' },
   *   { content: 'Note 3' }
   * ]);
   * console.log(`${results.succeeded} saved, ${results.failed} failed`);
   * ```
   */
  async batchSave(
    items: SaveOptions[],
    options?: {
      /** Maximum concurrent saves (default: 5) */
      concurrency?: number;
      /** Continue on errors (default: true) */
      continueOnError?: boolean;
      /** AbortSignal for cancellation */
      signal?: AbortSignal;
    }
  ): Promise<{
    results: Array<{ success: boolean; result?: SaveResult; error?: Error }>;
    succeeded: number;
    failed: number;
  }> {
    const concurrency = options?.concurrency ?? 5;
    const continueOnError = options?.continueOnError ?? true;
    const results: Array<{ success: boolean; result?: SaveResult; error?: Error }> = [];

    // Process in batches
    for (let i = 0; i < items.length; i += concurrency) {
      if (options?.signal?.aborted) {
        throw new TimeoutError(0, 'Batch save was cancelled');
      }

      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(item => this.save(item, { signal: options?.signal }))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({ success: true, result: result.value });
        } else {
          if (!continueOnError) {
            throw result.reason;
          }
          results.push({ success: false, error: result.reason });
        }
      }
    }

    return {
      results,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    };
  }

}

export default HypersaveClient;
