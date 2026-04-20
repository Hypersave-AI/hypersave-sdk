/**
 * Hypersave SDK Types
 * TypeScript interfaces for the Hypersave API
 */
export type DocumentType = 'url' | 'youtube' | 'pdf' | 'docx' | 'image' | 'video' | 'text' | 'audio' | 'unknown';
export type CategoryType = 'Work' | 'Personal' | 'Learning' | 'Research' | 'Entertainment' | 'News' | 'Reference' | 'Other';
export type SectorType = 'episodic' | 'semantic' | 'procedural' | 'emotional' | 'reflective';
export type SearchMode = 'fast' | 'balanced' | 'deep';
export interface HypersaveConfig {
    /** Your Hypersave API key */
    apiKey: string;
    /** Base URL for the API (default: https://api.hypersave.io) */
    baseUrl?: string;
    /** Request timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Default user ID for requests (optional) */
    userId?: string;
    /** Maximum number of retry attempts for transient errors (default: 3) */
    maxRetries?: number;
    /** Base delay in milliseconds for exponential backoff (default: 1000) */
    retryDelay?: number;
}
/**
 * Options that can be passed to individual API requests
 */
export interface RequestOptions {
    /** User ID for this specific request */
    userId?: string;
    /** AbortSignal for request cancellation */
    signal?: AbortSignal;
    /** Override timeout for this request (in milliseconds) */
    timeout?: number;
    /** Request ID for debugging/tracing */
    requestId?: string;
}
export interface SaveOptions {
    /** The content to save (text, URL, or file content) */
    content: string;
    /** Optional title for the content */
    title?: string;
    /** Document type (auto-detected if not provided) */
    type?: DocumentType;
    /** Category for organization */
    category?: CategoryType;
    /** Whether to process asynchronously (default: true) */
    async?: boolean;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface SaveResult {
    success: boolean;
    /** True if processed asynchronously */
    async?: boolean;
    /** Pending ID for async saves (use getSaveStatus to check) */
    pendingId?: string;
    /** Message for async saves */
    message?: string;
    /** URL to check status (for async saves) */
    checkStatus?: string;
    /** Saved document details (for sync saves) */
    saved?: {
        id: string;
        title: string;
        type: string;
        facts: number;
        sector: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface SaveStatus {
    success: boolean;
    status: 'processing' | 'indexed' | 'complete' | 'error';
    documentId?: string;
    title?: string;
    facts?: number;
    entities?: number;
    neuralIndexed?: boolean;
    fullProcessing?: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}
export interface AskOptions {
    /** The question to ask */
    query: string;
    /** User ID (overrides config default) */
    userId?: string;
}
/** Source document used in answer */
export interface AnswerSource {
    /** Source document or fact ID */
    id: string;
    /** Type of source */
    type: 'document' | 'fact' | 'triplet' | 'chunk';
    /** Snippet of content from source */
    content?: string;
    /** Title of source document */
    title?: string;
    /** Relevance score */
    relevance?: number;
}
export interface AskResult {
    success: boolean;
    /** The answer to your question */
    answer: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Source documents used */
    sources: AnswerSource[];
    /** Context about the retrieval */
    context: {
        /** Retrieval mode used */
        mode: string;
        /** Number of memories used */
        memoriesUsed: number;
        /** Time to retrieve in ms */
        retrievalTimeMs: number;
    };
    /** Total time in ms */
    timeMs?: number;
    /** Error message if failed */
    error?: string;
}
export interface SearchOptions {
    /** The search query */
    query: string;
    /** Whether to include context from related documents (default: true) */
    includeContext?: boolean;
    /** Maximum results to return */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface SearchResult {
    success: boolean;
    /** Search results */
    results: Array<{
        id: string;
        type: 'document' | 'fact';
        title?: string;
        content: string;
        category?: string;
        relevance: number;
    }>;
    /** Search statistics */
    stats?: {
        documents?: number;
        facts?: number;
        factsFound?: number;
        docsFound?: number;
        totalResults?: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface QueryOptions {
    /** The query message */
    message: string;
    /** Skip memory search (default: false) */
    skipMemory?: boolean;
    /** Maximum results to return */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface QueryResult {
    success: boolean;
    /** Whether memory was searched */
    memorySearched: boolean;
    /** Search results */
    results: Array<{
        id: string;
        type: 'document' | 'fact';
        title?: string;
        content: string;
        category?: string;
        relevance: number;
    }>;
    /** Active reminders that match the query */
    reminders: Array<{
        content: string;
        trigger: string;
        priority: number;
    }>;
    /** Query statistics */
    stats: {
        factsFound: number;
        docsFound: number;
        totalResults: number;
        latencyMs: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface Memory {
    id: string;
    title: string;
    summary?: string;
    type: DocumentType;
    category: CategoryType;
    sector?: SectorType;
    tags?: string[];
    created_at: string;
}
export interface MemoriesResult {
    success: boolean;
    /** List of saved documents */
    documents: Memory[];
    /** Total fact count */
    facts: number;
    /** Total document count */
    total: number;
    /** Error message if failed */
    error?: string;
}
export interface GetMemoriesOptions {
    /** Maximum documents to return (default: 50) */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface Fact {
    id: string;
    key: string;
    value: string;
    category: string;
    confidence: number;
    source?: string;
    created_at?: string;
}
/** Profile category with facts */
export interface ProfileCategory {
    /** Facts in this category */
    facts: Array<{
        key: string;
        value: string;
    }>;
    /** Summary of this category */
    summary?: string;
}
/** Structured user profile */
export interface UserProfile {
    /** Identity information */
    identity?: ProfileCategory;
    /** Work-related information */
    work?: ProfileCategory;
    /** Relationship information */
    relationships?: ProfileCategory;
    /** User preferences */
    preferences?: ProfileCategory;
    /** Skills and abilities */
    skills?: ProfileCategory;
    /** Other profile sections */
    [category: string]: ProfileCategory | undefined;
}
export interface ProfileResult {
    success: boolean;
    /** Structured user profile */
    profile: UserProfile;
    /** Raw facts */
    facts: Fact[];
    /** Core memory summary */
    coreMemory?: {
        humanBlock: string;
        personaBlock?: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface GraphNode {
    id: string;
    label: string;
    type: string;
    mentions?: number;
}
export interface GraphEdge {
    source: string;
    target: string;
    relation: string;
    weight?: number;
}
export interface GraphResult {
    success: boolean;
    /** Graph nodes */
    nodes: GraphNode[];
    /** Graph edges */
    edges: GraphEdge[];
    /** Graph statistics */
    stats?: {
        nodeCount: number;
        edgeCount: number;
        clusters?: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface RemindOptions {
    /** What to remind about */
    content: string;
    /** When to trigger (e.g., "tomorrow", "when I mention coffee") */
    trigger: string;
    /** Trigger type */
    triggerType?: 'time' | 'context' | 'location';
    /** Priority level (1-5) */
    priority?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface RemindResult {
    success: boolean;
    /** Created reminder ID */
    reminderId?: string;
    /** Reminder details */
    reminder?: {
        content: string;
        trigger: string;
        triggerType: string;
        priority: number;
        status: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface UsageResult {
    success: boolean;
    /** API usage statistics */
    usage: {
        documentsIndexed: number;
        factsExtracted: number;
        queriesProcessed: number;
        storageUsedMB: number;
    };
    /** Rate limit info */
    limits?: {
        requestsRemaining: number;
        resetAt: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface DeleteResult {
    success: boolean;
    /** Deleted document ID */
    deletedId?: string;
    /** Error message if failed */
    error?: string;
}
export type FactCategory = 'identity' | 'preference' | 'skill' | 'relationship' | 'location' | 'work' | 'education' | 'health' | 'finance' | 'travel' | 'hobbies' | 'goals' | 'beliefs' | 'habits' | 'memories' | 'opinions' | 'other';
export interface FactsOptions {
    /** Filter by category */
    category?: FactCategory;
    /** Maximum results to return */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface FactsResult {
    success: boolean;
    /** List of facts */
    facts: Fact[];
    /** Total count */
    count: number;
    /** Error message if failed */
    error?: string;
}
export interface RelationsOptions {
    /** Maximum results to return */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export type RelationType = 'updates' | 'extends' | 'derives' | 'contradicts' | 'supports' | 'relates_to';
export interface FactRelation {
    id: string;
    user_id: string;
    source_fact_id: string;
    target_fact_id: string;
    relation_type: RelationType;
    confidence: number;
    created_at: string;
}
export interface KnowledgeTriplet {
    id: string;
    user_id: string;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    source_doc_id?: string;
}
export interface RelationsResult {
    success: boolean;
    /** Fact relations */
    factRelations: FactRelation[];
    /** Knowledge triplets (subject-predicate-object) */
    knowledgeTriplets: KnowledgeTriplet[];
    /** Counts */
    counts: {
        factRelations: number;
        triplets: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface LatencyStats {
    p50: number;
    p95: number;
    avg: number;
    samples: number;
}
export interface MetricsResult {
    success: boolean;
    timestamp: string;
    /** Ask endpoint metrics */
    ask: {
        latency: LatencyStats;
    };
    /** Save endpoint metrics */
    save: {
        latency: LatencyStats;
    };
    /** Cache statistics */
    cache: {
        size: number;
        hitRate: string;
    };
    /** Fallback statistics */
    fallbacks: {
        total: number;
        byMode: Record<string, {
            count: number;
            percent: string;
        }>;
        gaps: string[];
    };
    /** Error message if failed */
    error?: string;
}
export type EntityType = 'person' | 'organization' | 'location' | 'event' | 'concept' | 'other';
export interface Entity {
    id: string;
    user_id: string;
    name: string;
    type: EntityType;
    mentions?: number;
    first_seen?: string;
    last_seen?: string;
}
export interface EntitiesOptions {
    /** Maximum results to return */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface EntitiesResult {
    success: boolean;
    /** List of entities */
    entities: Entity[];
    /** Total count */
    count: number;
    /** Error message if failed */
    error?: string;
}
export interface IngestOptions {
    /** The content to ingest */
    content: string;
    /** Title for the content */
    title: string;
    /** Document type */
    type?: DocumentType;
    /** Category for organization */
    category?: string;
    /** Memory sector */
    sector?: SectorType;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface IngestResult {
    success: boolean;
    /** Created document ID */
    documentId: string;
    /** Document title */
    title: string;
    /** Number of facts extracted */
    facts: number;
    /** Number of entities extracted */
    entities: number;
    /** Error message if failed */
    error?: string;
}
export interface Synapse {
    /** Unique synapse ID */
    id: string;
    /** Type of learned pattern */
    pattern_type: 'communication_style' | 'decision_making' | 'work_preference' | 'tool_preference' | 'collaboration_style' | string;
    /** Human-readable description of the pattern */
    description: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Number of observations supporting this pattern */
    evidence_count: number;
    /** When this pattern was last observed */
    last_observed: string;
}
export interface SynapsesResult {
    success: boolean;
    /** List of learned patterns */
    synapses: Synapse[];
    /** Total count */
    count: number;
    /** Error message if failed */
    error?: string;
}
export interface LearnResult {
    success: boolean;
    /** Message about the learning process */
    message: string;
    /** Number of new synapses created */
    newSynapses: number;
    /** Number of existing synapses updated */
    updatedSynapses: number;
    /** Total synapses after learning */
    totalSynapses: number;
    /** Error message if failed */
    error?: string;
}
export interface ForgetOptions {
    /** Text to search for and forget */
    query: string;
    /** Reason for erasure (default: "GDPR erasure request") */
    reason?: string;
}
export interface ForgetResult {
    success: boolean;
    /** Description of what was forgotten */
    message?: string;
    /** The search query used */
    searchQuery?: string;
    /** Counts of forgotten items */
    forgotten?: {
        total: number;
        facts?: number;
        documents?: number;
        chunks?: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface ForgetAllResult {
    success: boolean;
    /** Description of the erasure */
    message?: string;
    /** Type of erasure performed */
    erasureType?: 'permanent' | 'soft_delete';
    /** When the erasure occurred */
    erasedAt?: string;
    /** Counts of erased items by type */
    counts?: Record<string, number>;
    /** Total items erased */
    total?: number;
    /** Warning about data recovery */
    warning?: string;
    /** Error message if failed */
    error?: string;
}
export interface ExportResult {
    success: boolean;
    /** Description message */
    message?: string;
    /** All exported user data */
    data?: Record<string, unknown>;
    /** Error message if failed */
    error?: string;
}
export interface BrainConsolidateResult {
    success: boolean;
    /** Description message */
    message?: string;
    /** Number of items consolidated */
    consolidated?: number;
    /** Detailed result */
    result?: Record<string, unknown>;
    /** Error message if failed */
    error?: string;
}
export interface BrainContextResult {
    success: boolean;
    /** User context information */
    context?: {
        userId: string;
        timeOfDay: string;
        dayOfWeek: string;
        isWeekend: boolean;
        inferredMode: string;
        modeConfidence: number;
        currentTask?: string;
        currentFocus?: string;
        recentTopics: string[];
        boostFactors: Record<string, number>;
    };
    /** Error message if failed */
    error?: string;
}
export interface BrainRemindersResult {
    success: boolean;
    /** Number of reminders */
    count?: number;
    /** List of active reminders */
    reminders?: Array<{
        id?: string;
        reminderContent: string;
        triggerType: string;
        triggerValue: string;
        priority: number;
        isActive: boolean;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface BrainSessionResult {
    success: boolean;
    /** Session ID */
    sessionId?: string;
    /** Session details */
    session?: {
        sessionId: string;
        userId: string;
        taskContext?: string;
        maxItems?: number;
        createdAt?: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface FastSearchOptions {
    /** The search query */
    query: string;
    /** Maximum results to return */
    limit?: number;
    /** User ID (overrides config default) */
    userId?: string;
}
export interface FastSearchResult {
    success: boolean;
    /** Search results */
    results?: Array<{
        id: string;
        content: string;
        score: number;
        type?: string;
        metadata?: Record<string, unknown>;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface RemindersListResult {
    success: boolean;
    /** Reminder groups */
    reminders?: {
        active: Array<{
            id?: string;
            content: string;
            triggerType: string;
            triggerValue: string;
            priority: number;
            isActive: boolean;
            triggeredAt: string | null;
            createdAt: string | null;
        }>;
        triggered?: Array<{
            id?: string;
            content: string;
            triggerType: string;
            triggerValue: string;
            priority: number;
            isActive: boolean;
            triggeredAt: string | null;
            createdAt: string | null;
        }>;
        total: number;
    };
    /** Proactive suggestions based on synapses */
    suggestions?: Array<{
        type: string;
        content: string;
        reason: string;
        confidence: number;
        priority: number;
        category: string;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface WaypointGraphResult {
    success: boolean;
    /** Pagination info */
    pagination?: {
        limit: number;
        offset: number;
        hasMore: boolean;
    };
    /** Graph nodes (documents) */
    nodes?: Array<{
        id: string;
        title?: string;
        sector: string;
        category: string;
    }>;
    /** Graph edges (waypoints) */
    edges?: Array<{
        source: string;
        target: string;
        weight: number;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface WaypointStatsResult {
    success: boolean;
    /** Waypoint statistics */
    stats?: Record<string, unknown>;
    /** Error message if failed */
    error?: string;
}
export interface DocumentDetailResult {
    success: boolean;
    /** Document details */
    document?: {
        id: string;
        analysis?: Record<string, unknown>;
        createdAt?: string;
        salience?: number;
        decayLambda?: number;
        lastAccessedAt?: string;
        accessCount?: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface DocumentListResult {
    success: boolean;
    /** Total document count */
    total?: number;
    /** Whether more documents exist */
    hasMore?: boolean;
    /** Current offset */
    offset?: number;
    /** Current limit */
    limit?: number;
    /** Document list */
    documents?: Array<{
        id: string;
        title?: string;
        type?: string;
        category?: string;
        tags?: string[];
        createdAt?: string | number;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface ForgetLogResult {
    success: boolean;
    /** Audit log entries */
    log?: Array<Record<string, unknown>>;
    /** Number of log entries */
    count?: number;
    /** Error message if failed */
    error?: string;
}
export interface PinResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** The pinned/unpinned fact */
    fact?: Record<string, unknown>;
    /** Error message if failed */
    error?: string;
}
export interface ReinforceResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Memory ID */
    id?: string;
    /** Salience before reinforcement */
    oldSalience?: number;
    /** Salience after reinforcement */
    newSalience?: number;
    /** Gain applied */
    gain?: number;
    /** Error message if failed */
    error?: string;
}
export interface PenalizeResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Memory ID */
    id?: string;
    /** Salience before penalty */
    oldSalience?: number;
    /** Salience after penalty */
    newSalience?: number;
    /** Penalty applied */
    penalty?: number;
    /** Error message if failed */
    error?: string;
}
export interface ScheduleForgetResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Memory ID */
    id?: string;
    /** When the memory will be forgotten */
    scheduledFor?: string;
    /** Error message if failed */
    error?: string;
}
export interface CleanupFactsOptions {
    /** Remove duplicate keys, keep highest confidence (default: true) */
    deduplicate?: boolean;
    /** Remove facts attributed to third parties (default: true) */
    removeAttributed?: boolean;
    /** Remove facts below this confidence threshold (default: 0.3) */
    minConfidence?: number;
    /** If true, only report what would be deleted (default: true) */
    dryRun?: boolean;
}
export interface CleanupFactsResult {
    success: boolean;
    /** Whether this was a dry run */
    dryRun?: boolean;
    /** Description message */
    message?: string;
    /** Cleanup summary */
    summary?: {
        totalFacts?: number;
        totalFactsBefore?: number;
        toDelete?: number;
        deleted?: number;
        remaining?: number;
        unauthorized?: number;
        notFound?: number;
        byReason?: Record<string, number>;
    };
    /** Facts that would be or were deleted */
    factsToDelete?: Array<{
        id: string;
        category?: string;
        key?: string;
        value?: string;
        confidence?: number;
        reason?: string;
    }>;
    /** Error message if failed */
    error?: string;
}
export interface ContestFactResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** The contested fact */
    fact?: Record<string, unknown> | null;
    /** Error message if failed */
    error?: string;
}
export interface ResolveContestResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** The resolved fact */
    fact?: Record<string, unknown> | null;
    /** Error message if failed */
    error?: string;
}
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface OrgInfo {
    id: string;
    name: string;
    slug: string;
    plan?: string;
    role?: OrgRole;
    settings?: Record<string, unknown>;
    createdAt?: string | number;
}
export interface OrgMember {
    userId: string;
    role: OrgRole;
    joinedAt?: string | number;
    invitedBy?: string;
}
export interface CreateOrgResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Created org details */
    data?: {
        org: OrgInfo;
        role: string;
    };
    /** Error message if failed */
    error?: string;
}
export interface ListOrgsResult {
    success: boolean;
    /** Organization list */
    data?: {
        organizations: OrgInfo[];
    };
    /** Error message if failed */
    error?: string;
}
export interface GetOrgResult {
    success: boolean;
    /** Org details with members */
    data?: {
        org: OrgInfo;
        members: OrgMember[];
        memberCount: number;
    };
    /** Error message if failed */
    error?: string;
}
export interface InviteMemberResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Invited member details */
    data?: {
        userId: string;
        role: OrgRole;
    };
    /** Error message if failed */
    error?: string;
}
export interface RemoveMemberResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Error message if failed */
    error?: string;
}
export type WebhookEventType = 'save.completed' | 'save.failed' | 'memory.forgotten' | 'facts.extracted' | 'facts.contested' | 'reminder.triggered' | string;
export interface WebhookEndpoint {
    id: string;
    url: string;
    events: string[];
    status?: string;
    description?: string;
    failureCount?: number;
    lastDeliveryAt?: string | null;
    createdAt?: string;
}
export interface CreateWebhookResult {
    success: boolean;
    /** Created endpoint details */
    endpoint?: {
        id: string;
        url: string;
        events: string[];
        description?: string;
    };
    /** Signing secret (shown only once) */
    secret?: string;
    /** Confirmation message */
    message?: string;
    /** Error message if failed */
    error?: string;
}
export interface ListWebhooksResult {
    success: boolean;
    /** Registered webhook endpoints */
    endpoints?: WebhookEndpoint[];
    /** Total count */
    count?: number;
    /** Error message if failed */
    error?: string;
}
export interface DeleteWebhookResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Error message if failed */
    error?: string;
}
export interface TestWebhookResult {
    success: boolean;
    /** Confirmation message */
    message?: string;
    /** Error message if failed */
    error?: string;
}
export interface AuditLogEntry {
    id?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ip?: string;
    timestamp?: string | number;
}
export interface AuditLogOptions {
    /** Filter by action (e.g. 'save', 'delete', 'login') */
    action?: string;
    /** Filter by resource type (e.g. 'memory', 'api_key') */
    resource?: string;
    /** Start timestamp (ms since epoch) */
    start?: number;
    /** End timestamp (ms since epoch) */
    end?: number;
    /** Max records to return (default: 100, max: 1000) */
    limit?: number;
}
export interface AuditLogResult {
    success: boolean;
    /** Audit log entries */
    data?: AuditLogEntry[];
    /** Total count */
    count?: number;
    /** Error message if failed */
    error?: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
}
//# sourceMappingURL=types.d.ts.map