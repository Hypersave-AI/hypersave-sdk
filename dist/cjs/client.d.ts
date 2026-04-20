/**
 * Hypersave SDK Client
 * Main client class for interacting with the Hypersave API
 */
import { HypersaveConfig, SaveOptions, SaveResult, SaveStatus, AskResult, SearchOptions, SearchResult, QueryOptions, QueryResult, GetMemoriesOptions, MemoriesResult, ProfileResult, GraphResult, RemindOptions, RemindResult, UsageResult, DeleteResult, FactsOptions, FactsResult, RelationsOptions, RelationsResult, MetricsResult, EntitiesOptions, EntitiesResult, IngestOptions, IngestResult, SynapsesResult, LearnResult, RequestOptions, ForgetOptions, ForgetResult, ForgetAllResult, ExportResult, BrainConsolidateResult, BrainContextResult, BrainRemindersResult, BrainSessionResult, FastSearchOptions, FastSearchResult, RemindersListResult, WaypointGraphResult, WaypointStatsResult, DocumentDetailResult, DocumentListResult, ForgetLogResult, PinResult, ReinforceResult, PenalizeResult, ScheduleForgetResult, CleanupFactsOptions, CleanupFactsResult, ContestFactResult, ResolveContestResult, CreateOrgResult, ListOrgsResult, GetOrgResult, InviteMemberResult, RemoveMemberResult, CreateWebhookResult, ListWebhooksResult, DeleteWebhookResult, TestWebhookResult, AuditLogOptions, AuditLogResult } from './types.js';
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
     * Forget memories matching a content query (GDPR right to be forgotten)
     *
     * @example
     * ```typescript
     * const result = await client.forget({ query: 'sensitive information' });
     * console.log(`Forgot ${result.forgotten?.total} items`);
     * ```
     */
    forget(options: ForgetOptions, requestOptions?: RequestOptions): Promise<ForgetResult>;
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
    forgetAll(options?: {
        /** Set to true for permanent deletion (default: soft delete) */
        hardDelete?: boolean;
        /** Reason for erasure */
        reason?: string;
    } & RequestOptions): Promise<ForgetAllResult>;
    /**
     * Get the forgetting audit log
     *
     * @example
     * ```typescript
     * const log = await client.getForgetLog({ limit: 20 });
     * console.log(`${log.count} log entries`);
     * ```
     */
    getForgetLog(options?: {
        limit?: number;
    } & RequestOptions): Promise<ForgetLogResult>;
    /**
     * Export all user data in portable format (GDPR Article 20)
     *
     * @example
     * ```typescript
     * const exported = await client.exportData();
     * console.log(JSON.stringify(exported.data));
     * ```
     */
    exportData(requestOptions?: RequestOptions): Promise<ExportResult>;
    /**
     * Run memory consolidation (merges duplicate facts)
     *
     * @example
     * ```typescript
     * const result = await client.brainConsolidate();
     * console.log(`Consolidated ${result.consolidated} items`);
     * ```
     */
    brainConsolidate(requestOptions?: RequestOptions): Promise<BrainConsolidateResult>;
    /**
     * Get current user context (time, mode, focus, recent topics)
     *
     * @example
     * ```typescript
     * const ctx = await client.brainContext();
     * console.log(`Mode: ${ctx.context?.inferredMode}`);
     * ```
     */
    brainContext(requestOptions?: RequestOptions): Promise<BrainContextResult>;
    /**
     * Get active brain reminders (prospective memory)
     *
     * @example
     * ```typescript
     * const result = await client.brainReminders();
     * console.log(`${result.count} active reminders`);
     * ```
     */
    brainReminders(requestOptions?: RequestOptions): Promise<BrainRemindersResult>;
    /**
     * Start a working memory session
     *
     * @example
     * ```typescript
     * const session = await client.brainSessionStart({ taskContext: 'Code review' });
     * console.log(`Session: ${session.sessionId}`);
     * ```
     */
    brainSessionStart(options?: {
        /** Context for the working memory session */
        taskContext?: string;
    } & RequestOptions): Promise<BrainSessionResult>;
    /**
     * Get current working memory session
     *
     * @example
     * ```typescript
     * const session = await client.brainSessionCurrent();
     * console.log(session.session);
     * ```
     */
    brainSessionCurrent(requestOptions?: RequestOptions): Promise<BrainSessionResult>;
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
    detectContradictions(options?: {
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
    }>;
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
    analyze(options: {
        input: string;
        includeRawContent?: boolean;
    }, requestOptions?: RequestOptions): Promise<{
        success: boolean;
        id: string;
        type?: string;
        title?: string;
        summary?: string;
        category?: string;
        tags?: string[];
        sector?: {
            primary: string;
            scores: Record<string, number>;
        };
        entities?: Array<{
            name: string;
            type: string;
        }>;
        keyPoints?: string[];
        error?: string;
    }>;
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
    fastSearch(options: FastSearchOptions, requestOptions?: RequestOptions): Promise<FastSearchResult>;
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
    getReminders(options?: {
        /** Include already-triggered reminders */
        includeTriggered?: boolean;
        /** Include proactive suggestions (default: true) */
        includeSuggestions?: boolean;
    } & RequestOptions): Promise<RemindersListResult>;
    /**
     * Get the waypoint graph (document connections)
     *
     * @example
     * ```typescript
     * const graph = await client.getWaypointGraph();
     * console.log(`${graph.nodes?.length} nodes, ${graph.edges?.length} edges`);
     * ```
     */
    getWaypointGraph(options?: {
        /** Maximum items to return (default: 500) */
        limit?: number;
        /** Offset for pagination */
        offset?: number;
    } & RequestOptions): Promise<WaypointGraphResult>;
    /**
     * Get waypoint statistics
     *
     * @example
     * ```typescript
     * const stats = await client.getWaypointStats();
     * console.log(stats.stats);
     * ```
     */
    getWaypointStats(requestOptions?: RequestOptions): Promise<WaypointStatsResult>;
    /**
     * Rebuild waypoint connections between recent documents
     *
     * @example
     * ```typescript
     * const result = await client.rebuildWaypoints({ threshold: 0.8, limit: 50 });
     * console.log(`Processed ${result.documentsProcessed} docs, created ${result.waypointsCreated} waypoints`);
     * ```
     */
    rebuildWaypoints(options?: {
        /** Similarity threshold (0-1, default: 0.75) */
        threshold?: number;
        /** Maximum documents to process (default: 50, max: 100) */
        limit?: number;
    } & RequestOptions): Promise<{
        success: boolean;
        documentsProcessed: number;
        waypointsCreated: number;
        error?: string;
    }>;
    /**
     * Get a document by ID
     *
     * @example
     * ```typescript
     * const doc = await client.getDocument('doc-123');
     * console.log(doc.document?.analysis);
     * ```
     */
    getDocument(id: string, requestOptions?: RequestOptions): Promise<DocumentDetailResult>;
    /**
     * List documents with pagination
     *
     * @example
     * ```typescript
     * const docs = await client.getDocuments({ limit: 20 });
     * console.log(`${docs.total} total, showing ${docs.documents?.length}`);
     * ```
     */
    getDocuments(options?: {
        /** Maximum documents to return (default: 50, max: 100) */
        limit?: number;
        /** Offset for pagination */
        offset?: number;
    } & RequestOptions): Promise<DocumentListResult>;
    /**
     * Delete a document by ID
     *
     * @example
     * ```typescript
     * await client.deleteDocument('doc-123');
     * ```
     */
    deleteDocument(id: string, requestOptions?: RequestOptions): Promise<DeleteResult>;
    /**
     * Forget a specific memory by ID (GDPR-compliant soft deletion)
     *
     * @example
     * ```typescript
     * const result = await client.forgetMemory('doc-123', { reason: 'User request' });
     * console.log(result.message); // 'Memory forgotten'
     * ```
     */
    forgetMemory(id: string, options?: {
        /** Whether to cascade-delete related chunks and facts (default: true) */
        cascade?: boolean;
        /** Reason for the audit log */
        reason?: string;
    } & RequestOptions): Promise<DeleteResult>;
    /**
     * Pin a memory so it never decays (salience stays at 1.0)
     *
     * @example
     * ```typescript
     * const result = await client.pinMemory('fact-123');
     * console.log(result.message); // 'Memory pinned'
     * ```
     */
    pinMemory(id: string, requestOptions?: RequestOptions): Promise<PinResult>;
    /**
     * Unpin a memory so it decays normally again
     *
     * @example
     * ```typescript
     * const result = await client.unpinMemory('fact-123');
     * console.log(result.message); // 'Memory unpinned'
     * ```
     */
    unpinMemory(id: string, requestOptions?: RequestOptions): Promise<PinResult>;
    /**
     * Reinforce a memory's salience (mark as important)
     *
     * @example
     * ```typescript
     * const result = await client.reinforceMemory('fact-123', 0.3);
     * console.log(`Salience: ${result.oldSalience} -> ${result.newSalience}`);
     * ```
     */
    reinforceMemory(id: string, gain?: number, requestOptions?: RequestOptions): Promise<ReinforceResult>;
    /**
     * Penalize a memory's salience (mark as less important)
     *
     * @example
     * ```typescript
     * const result = await client.penalizeMemory('fact-123', 0.2);
     * console.log(`Salience: ${result.oldSalience} -> ${result.newSalience}`);
     * ```
     */
    penalizeMemory(id: string, amount?: number, requestOptions?: RequestOptions): Promise<PenalizeResult>;
    /**
     * Schedule a memory to be automatically forgotten at a future date
     *
     * @example
     * ```typescript
     * const result = await client.scheduleForget('doc-123', '2025-01-01T00:00:00Z', 'Temporary data');
     * console.log(`Will forget at: ${result.scheduledFor}`);
     * ```
     */
    scheduleForget(id: string, forgetAt: string | Date, reason?: string, requestOptions?: RequestOptions): Promise<ScheduleForgetResult>;
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
    cleanupFacts(options?: CleanupFactsOptions & RequestOptions): Promise<CleanupFactsResult>;
    /**
     * Contest a fact (mark as disputed)
     *
     * @example
     * ```typescript
     * const result = await client.contestFact('fact-123', 'This is outdated');
     * console.log(result.message); // 'Fact contested successfully'
     * ```
     */
    contestFact(id: string, reason: string, conflictingFactId?: string, requestOptions?: RequestOptions): Promise<ContestFactResult>;
    /**
     * Resolve a contested fact (clear disputed status)
     *
     * @example
     * ```typescript
     * const result = await client.resolveContest('fact-123');
     * console.log(result.message); // 'Contest resolved successfully'
     * ```
     */
    resolveContest(id: string, requestOptions?: RequestOptions): Promise<ResolveContestResult>;
    /**
     * Create a new organization
     *
     * @example
     * ```typescript
     * const result = await client.createOrg('Acme Inc', 'acme-inc');
     * console.log(`Org created: ${result.data?.org.id}`);
     * ```
     */
    createOrg(name: string, slug: string, requestOptions?: RequestOptions): Promise<CreateOrgResult>;
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
    getOrgs(requestOptions?: RequestOptions): Promise<ListOrgsResult>;
    /**
     * Get organization details including members
     *
     * @example
     * ```typescript
     * const result = await client.getOrg('org-123');
     * console.log(`${result.data?.org.name}: ${result.data?.memberCount} members`);
     * ```
     */
    getOrg(orgId: string, requestOptions?: RequestOptions): Promise<GetOrgResult>;
    /**
     * Invite a member to an organization
     *
     * @example
     * ```typescript
     * const result = await client.inviteMember('org-123', 'user-456', 'member');
     * console.log(result.message); // 'Member added with role "member"'
     * ```
     */
    inviteMember(orgId: string, userId: string, role: 'admin' | 'member' | 'viewer', requestOptions?: RequestOptions): Promise<InviteMemberResult>;
    /**
     * Remove a member from an organization
     *
     * @example
     * ```typescript
     * await client.removeMember('org-123', 'user-456');
     * ```
     */
    removeMember(orgId: string, memberId: string, requestOptions?: RequestOptions): Promise<RemoveMemberResult>;
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
    createWebhook(url: string, events: string[], description?: string, requestOptions?: RequestOptions): Promise<CreateWebhookResult>;
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
    listWebhooks(requestOptions?: RequestOptions): Promise<ListWebhooksResult>;
    /**
     * Delete a webhook endpoint
     *
     * @example
     * ```typescript
     * await client.deleteWebhook('webhook-123');
     * ```
     */
    deleteWebhook(id: string, requestOptions?: RequestOptions): Promise<DeleteWebhookResult>;
    /**
     * Send a test event to a webhook endpoint
     *
     * @example
     * ```typescript
     * const result = await client.testWebhook('webhook-123');
     * console.log(result.message);
     * ```
     */
    testWebhook(id: string, requestOptions?: RequestOptions): Promise<TestWebhookResult>;
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
    getAuditLogs(options?: AuditLogOptions & RequestOptions): Promise<AuditLogResult>;
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
    exportAuditLogs(format?: 'json' | 'csv', dateRange?: {
        start: number;
        end: number;
    }, requestOptions?: RequestOptions): Promise<ExportResult>;
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