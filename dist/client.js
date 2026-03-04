/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */
import { HypersaveError, AuthenticationError, ValidationError, TimeoutError, NetworkError, ParseError, NotFoundError, RateLimitError, ServerError, createErrorFromStatus, } from './errors.js';
const DEFAULT_BASE_URL = 'https://api.hypersave.io';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const MAX_JITTER_MS = 200;
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
    apiKey;
    baseUrl;
    timeout;
    defaultUserId;
    maxRetries;
    retryDelay;
    /** Active abort controllers for cleanup */
    activeRequests = new Map();
    constructor(config) {
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
    cancelAll() {
        for (const [requestId, controller] of this.activeRequests) {
            controller.abort();
            this.activeRequests.delete(requestId);
        }
    }
    /**
     * Get count of active requests
     */
    get activeRequestCount() {
        return this.activeRequests.size;
    }
    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================
    /**
     * Generate a unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Add random jitter to prevent thundering herd
     */
    addJitter(baseDelay) {
        const jitter = Math.random() * MAX_JITTER_MS;
        return baseDelay + jitter;
    }
    /**
     * Check if an error is retryable
     */
    isRetryable(error) {
        // Don't retry client errors (4xx except 429)
        if (error instanceof ValidationError ||
            error instanceof AuthenticationError ||
            error instanceof NotFoundError ||
            error instanceof ParseError) {
            return false;
        }
        // Retry on rate limit, network, server, and timeout errors
        return (error instanceof RateLimitError ||
            error instanceof NetworkError ||
            error instanceof ServerError ||
            error instanceof TimeoutError);
    }
    /**
     * Calculate backoff delay for retry attempt
     */
    calculateBackoff(attempt, error) {
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
    async request(method, path, body, options) {
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
            const headers = {
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
            return data;
        }
        catch (error) {
            clearTimeout(timeoutId);
            this.activeRequests.delete(requestId);
            // Type guard for Error objects
            const isError = (e) => e instanceof Error;
            const hasName = (e) => typeof e === 'object' && e !== null && 'name' in e;
            // Handle abort - distinguish between user cancellation and timeout
            if (hasName(error) && error.name === 'AbortError') {
                if (options?.signal?.aborted) {
                    throw new TimeoutError(0, 'Request was cancelled');
                }
                throw new TimeoutError(requestTimeout);
            }
            // Handle network errors
            if (hasName(error) &&
                error.name === 'TypeError' &&
                isError(error) &&
                error.message.includes('fetch')) {
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
    sleep(ms, signal) {
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
    async requestWithRetry(method, path, body, options) {
        let lastError;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await this.request(method, path, body, options);
            }
            catch (error) {
                lastError = error;
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
                    }
                    catch {
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
    async save(options, requestOptions) {
        if (!options.content) {
            throw new ValidationError('Content is required');
        }
        if (typeof options.content !== 'string') {
            throw new ValidationError('Content must be a string');
        }
        return this.requestWithRetry('POST', '/v1/save', {
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
    async saveSync(options, requestOptions) {
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
    async getSaveStatus(pendingId, requestOptions) {
        if (!pendingId) {
            throw new ValidationError('Pending ID is required');
        }
        if (typeof pendingId !== 'string') {
            throw new ValidationError('Pending ID must be a string');
        }
        return this.requestWithRetry('GET', `/v1/save/status/${encodeURIComponent(pendingId)}`, undefined, requestOptions);
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
    async ask(query, options) {
        if (!query) {
            throw new ValidationError('Query is required');
        }
        if (typeof query !== 'string') {
            throw new ValidationError('Query must be a string');
        }
        if (query.length > 10000) {
            throw new ValidationError('Query exceeds maximum length of 10000 characters');
        }
        return this.requestWithRetry('POST', '/v1/ask', {
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
    async search(query, options) {
        if (!query) {
            throw new ValidationError('Query is required');
        }
        if (typeof query !== 'string') {
            throw new ValidationError('Query must be a string');
        }
        return this.requestWithRetry('POST', '/v1/search', {
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
    async query(message, options) {
        if (!message) {
            throw new ValidationError('Message is required');
        }
        if (typeof message !== 'string') {
            throw new ValidationError('Message must be a string');
        }
        return this.requestWithRetry('POST', '/v1/query', {
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
    async getMemories(options) {
        const params = new URLSearchParams();
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/memories${query ? `?${query}` : ''}`, undefined, options);
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
    async getProfile(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        if (options?.section)
            params.set('section', options.section);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/profile${query ? `?${query}` : ''}`, undefined, options);
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
    async getGraph(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        if (options?.entity)
            params.set('entity', options.entity);
        if (options?.depth)
            params.set('depth', options.depth.toString());
        if (options?.startEntity)
            params.set('startEntity', options.startEntity);
        if (options?.endEntity)
            params.set('endEntity', options.endEntity);
        if (options?.centerEntity)
            params.set('centerEntity', options.centerEntity);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/graph${query ? `?${query}` : ''}`, undefined, options);
    }
    /**
     * Delete a memory by ID
     *
     * @example
     * ```typescript
     * await client.deleteMemory('doc-123');
     * ```
     */
    async deleteMemory(id, options) {
        if (!id) {
            throw new ValidationError('Memory ID is required');
        }
        if (typeof id !== 'string') {
            throw new ValidationError('Memory ID must be a string');
        }
        return this.requestWithRetry('DELETE', `/v1/memory/${encodeURIComponent(id)}`, undefined, options);
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
    async remind(options, requestOptions) {
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
        return this.requestWithRetry('POST', '/v1/remind', {
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
    async getUsage(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/usage${query ? `?${query}` : ''}`, undefined, options);
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
    async getFacts(options) {
        const params = new URLSearchParams();
        if (options?.category)
            params.set('category', options.category);
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.offset)
            params.set('offset', String(options.offset));
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/facts${query ? `?${query}` : ''}`, undefined, options);
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
    async getRelations(options) {
        const params = new URLSearchParams();
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/relations${query ? `?${query}` : ''}`, undefined, options);
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
    async getMetrics(requestOptions) {
        return this.requestWithRetry('GET', '/v1/metrics', undefined, requestOptions);
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
    async getEntities(options) {
        const params = new URLSearchParams();
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/entities${query ? `?${query}` : ''}`, undefined, options);
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
    async ingest(options, requestOptions) {
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
        return this.requestWithRetry('POST', '/v1/ingest', {
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
    async getSynapses(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.requestWithRetry('GET', `/v1/synapses${query ? `?${query}` : ''}`, undefined, options);
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
    async triggerLearning(options) {
        const lookbackDays = options?.lookbackDays ?? 30;
        if (typeof lookbackDays !== 'number' || lookbackDays < 1 || lookbackDays > 365) {
            throw new ValidationError('lookbackDays must be a number between 1 and 365');
        }
        return this.requestWithRetry('POST', '/v1/synapses/learn', {
            lookbackDays,
        }, options);
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
    async waitForSave(pendingId, options) {
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
    async batchSave(items, options) {
        const concurrency = options?.concurrency ?? 5;
        const continueOnError = options?.continueOnError ?? true;
        const results = [];
        // Process in batches
        for (let i = 0; i < items.length; i += concurrency) {
            if (options?.signal?.aborted) {
                throw new TimeoutError(0, 'Batch save was cancelled');
            }
            const batch = items.slice(i, i + concurrency);
            const batchResults = await Promise.allSettled(batch.map(item => this.save(item, { signal: options?.signal })));
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push({ success: true, result: result.value });
                }
                else {
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
//# sourceMappingURL=client.js.map