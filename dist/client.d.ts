/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */
import { HypersaveConfig, SaveOptions, SaveResult, SaveStatus, AskResult, SearchOptions, SearchResult, QueryOptions, QueryResult, GetMemoriesOptions, MemoriesResult, ProfileResult, GraphResult, RemindOptions, RemindResult, UsageResult, DeleteResult, FactsOptions, FactsResult, RelationsOptions, RelationsResult, MetricsResult, EntitiesOptions, EntitiesResult, IngestOptions, IngestResult, SynapsesResult, LearnResult, RequestOptions } from './types.js';
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
export declare class HypersaveClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly defaultUserId?;
    private readonly maxRetries;
    private readonly retryDelay;
    /** Active abort controllers for cleanup */
    private readonly activeRequests;
    constructor(config: HypersaveConfig);
    /**
     * Cancel all active requests
     */
    cancelAll(): void;
    /**
     * Get count of active requests
     */
    get activeRequestCount(): number;
    /**
     * Generate a unique request ID
     */
    private generateRequestId;
    /**
     * Add random jitter to prevent thundering herd
     */
    private addJitter;
    /**
     * Check if an error is retryable
     */
    private isRetryable;
    /**
     * Calculate backoff delay for retry attempt
     */
    private calculateBackoff;
    /**
     * Make an HTTP request to the API
     */
    private request;
    /**
     * Sleep for a given number of milliseconds (cancellable)
     */
    private sleep;
    /**
     * Make an HTTP request with retry logic for transient errors
     */
    private requestWithRetry;
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
    save(options: SaveOptions, requestOptions?: RequestOptions): Promise<SaveResult>;
    /**
     * Save content synchronously (waits for completion)
     *
     * @example
     * ```typescript
     * const result = await client.saveSync({ content: 'My note' });
     * console.log(`Saved with ${result.saved?.facts} facts`);
     * ```
     */
    saveSync(options: Omit<SaveOptions, 'async'>, requestOptions?: RequestOptions): Promise<SaveResult>;
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
    getSaveStatus(pendingId: string, requestOptions?: RequestOptions): Promise<SaveStatus>;
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
    ask(query: string, options?: RequestOptions & {
        userId?: string;
    }): Promise<AskResult>;
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
    search(query: string, options?: Omit<SearchOptions, 'query'> & RequestOptions): Promise<SearchResult>;
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
    query(message: string, options?: Omit<QueryOptions, 'message'> & RequestOptions): Promise<QueryResult>;
    /**
     * Get all saved memories (documents and facts count)
     *
     * @example
     * ```typescript
     * const memories = await client.getMemories({ limit: 100 });
     * console.log(`${memories.total} documents, ${memories.facts} facts`);
     * ```
     */
    getMemories(options?: GetMemoriesOptions & RequestOptions): Promise<MemoriesResult>;
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
    getProfile(options?: RequestOptions & {
        userId?: string;
        /** Filter to specific section: identity, work, health, preference, etc. */
        section?: string;
    }): Promise<ProfileResult>;
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
    getGraph(options?: RequestOptions & {
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
    }): Promise<GraphResult>;
    /**
     * Delete a memory by ID
     *
     * @example
     * ```typescript
     * await client.deleteMemory('doc-123');
     * ```
     */
    deleteMemory(id: string, options?: RequestOptions & {
        userId?: string;
    }): Promise<DeleteResult>;
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
    remind(options: RemindOptions, requestOptions?: RequestOptions): Promise<RemindResult>;
    /**
     * Get API usage statistics
     *
     * @example
     * ```typescript
     * const usage = await client.getUsage();
     * console.log(`${usage.usage.documentsIndexed} documents indexed`);
     * ```
     */
    getUsage(options?: RequestOptions & {
        userId?: string;
    }): Promise<UsageResult>;
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
    getFacts(options?: FactsOptions & RequestOptions): Promise<FactsResult>;
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
    getRelations(options?: RelationsOptions & RequestOptions): Promise<RelationsResult>;
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
    getMetrics(requestOptions?: RequestOptions): Promise<MetricsResult>;
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
    getEntities(options?: EntitiesOptions & RequestOptions): Promise<EntitiesResult>;
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
    ingest(options: IngestOptions, requestOptions?: RequestOptions): Promise<IngestResult>;
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
    getSynapses(options?: RequestOptions & {
        userId?: string;
    }): Promise<SynapsesResult>;
    /**
     * Trigger synapse learning from recent interactions
     *
     * @example
     * ```typescript
     * const result = await client.triggerLearning({ lookbackDays: 30 });
     * console.log(`New: ${result.newSynapses}, Updated: ${result.updatedSynapses}`);
     * ```
     */
    triggerLearning(options?: {
        lookbackDays?: number;
    } & RequestOptions): Promise<LearnResult>;
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
    waitForSave(pendingId: string, options?: {
        /** Polling interval in ms (default: 1000) */
        pollInterval?: number;
        /** Maximum wait time in ms (default: 60000) */
        maxWait?: number;
        /** AbortSignal for cancellation */
        signal?: AbortSignal;
    }): Promise<SaveStatus>;
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
    batchSave(items: SaveOptions[], options?: {
        /** Maximum concurrent saves (default: 5) */
        concurrency?: number;
        /** Continue on errors (default: true) */
        continueOnError?: boolean;
        /** AbortSignal for cancellation */
        signal?: AbortSignal;
    }): Promise<{
        results: Array<{
            success: boolean;
            result?: SaveResult;
            error?: Error;
        }>;
        succeeded: number;
        failed: number;
    }>;
}
export default HypersaveClient;
//# sourceMappingURL=client.d.ts.map