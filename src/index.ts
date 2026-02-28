/**
 * Hypersave SDK
 * Official TypeScript/JavaScript SDK for the Hypersave API
 *
 * @packageDocumentation
 */

// Main client
export { HypersaveClient, default } from './client.js';

// All types
export type {
  // Configuration
  HypersaveConfig,

  // Core types
  DocumentType,
  CategoryType,
  SectorType,
  SearchMode,

  // Save
  SaveOptions,
  SaveResult,
  SaveStatus,

  // Ask
  AskOptions,
  AskResult,

  // Search
  SearchOptions,
  SearchResult,

  // Query
  QueryOptions,
  QueryResult,

  // Memories
  Memory,
  MemoriesResult,
  GetMemoriesOptions,

  // Profile
  Fact,
  ProfileResult,

  // Graph
  GraphNode,
  GraphEdge,
  GraphResult,

  // Remind
  RemindOptions,
  RemindResult,

  // Usage
  UsageResult,

  // Delete
  DeleteResult,

  // Facts
  FactCategory,
  FactsOptions,
  FactsResult,

  // Relations
  RelationType,
  FactRelation,
  KnowledgeTriplet,
  RelationsOptions,
  RelationsResult,

  // Metrics
  LatencyStats,
  MetricsResult,

  // Entities
  EntityType,
  Entity,
  EntitiesOptions,
  EntitiesResult,

  // Ingest
  IngestOptions,
  IngestResult,

  // Generic
  ApiResponse,
} from './types.js';

// Error classes
export {
  HypersaveError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ServerError,
  ParseError,
  createErrorFromStatus,
  isHypersaveError,
  isErrorType,
} from './errors.js';
