/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */
import { HypersaveError, AuthenticationError, ValidationError, TimeoutError, NetworkError, ParseError, createErrorFromStatus, } from './errors.js';
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
    apiKey;
    baseUrl;
    timeout;
    defaultUserId;
    constructor(config) {
        if (!config.apiKey) {
            throw new AuthenticationError('API key is required');
        }
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
        this.timeout = config.timeout || DEFAULT_TIMEOUT;
        this.defaultUserId = config.userId;
    }
    // ============================================================================
    // PRIVATE HELPERS
    // ============================================================================
    /**
     * Make an HTTP request to the API
     */
    async request(method, path, body, options) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const headers = {
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
            return data;
        }
        catch (error) {
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
    async save(options) {
        if (!options.content) {
            throw new ValidationError('Content is required');
        }
        return this.request('POST', '/v1/save', {
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
    async saveSync(options) {
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
    async getSaveStatus(pendingId) {
        if (!pendingId) {
            throw new ValidationError('Pending ID is required');
        }
        return this.request('GET', `/v1/save/status/${encodeURIComponent(pendingId)}`);
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
    async ask(query, options) {
        if (!query) {
            throw new ValidationError('Query is required');
        }
        return this.request('POST', '/v1/ask', {
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
    async search(query, options) {
        if (!query) {
            throw new ValidationError('Query is required');
        }
        return this.request('POST', '/v1/search', {
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
    async query(message, options) {
        if (!message) {
            throw new ValidationError('Message is required');
        }
        return this.request('POST', '/v1/query', {
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
    async getMemories(options) {
        const params = new URLSearchParams();
        if (options?.limit)
            params.set('limit', String(options.limit));
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.request('GET', `/v1/memories${query ? `?${query}` : ''}`);
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
    async getProfile(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.request('GET', `/v1/profile${query ? `?${query}` : ''}`);
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
    async getGraph(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.request('GET', `/v1/graph${query ? `?${query}` : ''}`);
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
        return this.request('DELETE', `/v1/memory/${encodeURIComponent(id)}`, undefined, options);
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
    async remind(options) {
        if (!options.content) {
            throw new ValidationError('Reminder content is required');
        }
        if (!options.trigger) {
            throw new ValidationError('Reminder trigger is required');
        }
        return this.request('POST', '/v1/remind', {
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
    async getUsage(options) {
        const params = new URLSearchParams();
        if (options?.userId)
            params.set('userId', options.userId);
        const query = params.toString();
        return this.request('GET', `/v1/usage${query ? `?${query}` : ''}`);
    }
}
export default HypersaveClient;
//# sourceMappingURL=client.js.map