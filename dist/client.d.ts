/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */
import { HypersaveConfig, SaveOptions, SaveResult, SaveStatus, AskResult, SearchOptions, SearchResult, QueryOptions, QueryResult, GetMemoriesOptions, MemoriesResult, ProfileResult, GraphResult, RemindOptions, RemindResult, UsageResult, DeleteResult } from './types.js';
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
export declare class HypersaveClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly defaultUserId?;
    constructor(config: HypersaveConfig);
    /**
     * Make an HTTP request to the API
     */
    private request;
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
    save(options: SaveOptions): Promise<SaveResult>;
    /**
     * Save content synchronously (waits for completion)
     *
     * @example
     * ```typescript
     * const result = await client.saveSync({ content: 'My note' });
     * console.log(`Saved with ${result.saved?.facts} facts`);
     * ```
     */
    saveSync(options: Omit<SaveOptions, 'async'>): Promise<SaveResult>;
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
    getSaveStatus(pendingId: string): Promise<SaveStatus>;
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
    ask(query: string, options?: {
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
    search(query: string, options?: Omit<SearchOptions, 'query'>): Promise<SearchResult>;
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
    query(message: string, options?: Omit<QueryOptions, 'message'>): Promise<QueryResult>;
    /**
     * Get all saved memories (documents and facts count)
     *
     * @example
     * ```typescript
     * const memories = await client.getMemories({ limit: 100 });
     * console.log(`${memories.total} documents, ${memories.facts} facts`);
     * ```
     */
    getMemories(options?: GetMemoriesOptions): Promise<MemoriesResult>;
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
    getProfile(options?: {
        userId?: string;
    }): Promise<ProfileResult>;
    /**
     * Get your knowledge graph
     *
     * @example
     * ```typescript
     * const graph = await client.getGraph();
     * console.log(`${graph.nodes.length} nodes, ${graph.edges.length} edges`);
     * ```
     */
    getGraph(options?: {
        userId?: string;
    }): Promise<GraphResult>;
    /**
     * Delete a memory by ID
     *
     * @example
     * ```typescript
     * await client.deleteMemory('doc-123');
     * ```
     */
    deleteMemory(id: string, options?: {
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
    remind(options: RemindOptions): Promise<RemindResult>;
    /**
     * Get API usage statistics
     *
     * @example
     * ```typescript
     * const usage = await client.getUsage();
     * console.log(`${usage.usage.documentsIndexed} documents indexed`);
     * ```
     */
    getUsage(options?: {
        userId?: string;
    }): Promise<UsageResult>;
}
export default HypersaveClient;
//# sourceMappingURL=client.d.ts.map