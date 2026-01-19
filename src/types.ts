/**
 * Hypersave SDK Types
 * TypeScript interfaces for the Hypersave API
 */

// ============================================================================
// CORE TYPES (from API)
// ============================================================================

export type DocumentType =
  | 'url'
  | 'youtube'
  | 'pdf'
  | 'docx'
  | 'image'
  | 'video'
  | 'text'
  | 'audio'
  | 'unknown';

export type CategoryType =
  | 'Work'
  | 'Personal'
  | 'Learning'
  | 'Research'
  | 'Entertainment'
  | 'News'
  | 'Reference'
  | 'Other';

export type SectorType =
  | 'episodic'
  | 'semantic'
  | 'procedural'
  | 'emotional'
  | 'reflective';

export type SearchMode = 'fast' | 'balanced' | 'deep';

// ============================================================================
// SDK CONFIGURATION
// ============================================================================

export interface HypersaveConfig {
  /** Your Hypersave API key */
  apiKey: string;
  /** Base URL for the API (default: https://api.hypersave.io) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Default user ID for requests (optional) */
  userId?: string;
}

// ============================================================================
// SAVE TYPES
// ============================================================================

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

// ============================================================================
// ASK TYPES
// ============================================================================

export interface AskOptions {
  /** The question to ask */
  query: string;
  /** User ID (overrides config default) */
  userId?: string;
}

export interface AskResult {
  success: boolean;
  /** The answer to your question */
  answer: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source documents used */
  sources: any[];
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

// ============================================================================
// SEARCH TYPES
// ============================================================================

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

// ============================================================================
// QUERY TYPES (Multi-strategy search)
// ============================================================================

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

// ============================================================================
// MEMORY TYPES
// ============================================================================

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

// ============================================================================
// PROFILE TYPES
// ============================================================================

export interface Fact {
  id: string;
  key: string;
  value: string;
  category: string;
  confidence: number;
  source?: string;
  created_at?: string;
}

export interface ProfileResult {
  success: boolean;
  /** Structured user profile */
  profile: Record<string, any>;
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

// ============================================================================
// GRAPH TYPES
// ============================================================================

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

// ============================================================================
// REMINDER TYPES
// ============================================================================

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

// ============================================================================
// USAGE TYPES
// ============================================================================

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

// ============================================================================
// V7 ENHANCED TYPES
// ============================================================================

export interface V7SearchOptions {
  /** The search query */
  query: string;
  /** Search mode (fast, balanced, deep) */
  mode?: SearchMode;
  /** Filter by sectors */
  sectors?: SectorType[];
  /** Maximum results */
  limit?: number;
  /** User ID (overrides config default) */
  userId?: string;
}

export interface V7SearchResult {
  success: boolean;
  /** Search results with chunks */
  results: Array<{
    id: string;
    content: string;
    score: number;
    documentId?: string;
    documentTitle?: string;
    chunkIndex?: number;
  }>;
  /** Search statistics */
  stats: {
    totalChunks: number;
    searchTimeMs: number;
    mode: string;
  };
  /** Error message if failed */
  error?: string;
}

export interface V7AskResult {
  success: boolean;
  /** The answer */
  answer: string;
  /** Source chunks used */
  sources: Array<{
    content: string;
    documentTitle?: string;
    relevance: number;
  }>;
  /** Confidence score */
  confidence: number;
  /** Error message if failed */
  error?: string;
}

export interface V7IngestOptions {
  /** Content to ingest */
  content: string;
  /** Document title */
  title: string;
  /** Document type */
  type?: DocumentType;
  /** Category */
  category?: CategoryType;
  /** Memory sector */
  sector?: SectorType;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** User ID (overrides config default) */
  userId?: string;
}

export interface V7IngestResult {
  success: boolean;
  /** Ingested document ID */
  documentId?: string;
  /** Number of chunks created */
  chunksCreated?: number;
  /** Number of entities extracted */
  entitiesExtracted?: number;
  /** Error message if failed */
  error?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'concept' | 'other';
  mentions: number;
  lastSeen?: string;
}

export interface V7EntitiesResult {
  success: boolean;
  /** Extracted entities */
  entities: Entity[];
  /** Total count */
  count: number;
  /** Error message if failed */
  error?: string;
}

export interface V7EntityResult {
  success: boolean;
  /** Entity details */
  entity?: Entity & {
    facts?: string[];
    relatedEntities?: string[];
  };
  /** Documents mentioning this entity */
  documents: Array<{
    id: string;
    title: string;
    relevance: number;
  }>;
  /** Document count */
  documentCount: number;
  /** Error message if failed */
  error?: string;
}

export interface V7FactsResult {
  success: boolean;
  /** User facts */
  facts: Fact[];
  /** Total count */
  count: number;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// DELETE TYPES
// ============================================================================

export interface DeleteResult {
  success: boolean;
  /** Deleted document ID */
  deletedId?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
