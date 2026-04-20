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
  RequestOptions,

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

  // Synapses
  Synapse,
  SynapsesResult,
  LearnResult,

  // Forget (GDPR)
  ForgetOptions,
  ForgetResult,
  ForgetAllResult,
  ForgetLogResult,

  // Export (GDPR)
  ExportResult,

  // Brain
  BrainConsolidateResult,
  BrainContextResult,
  BrainRemindersResult,
  BrainSessionResult,

  // Fast Search
  FastSearchOptions,
  FastSearchResult,

  // Reminders List
  RemindersListResult,

  // Waypoints
  WaypointGraphResult,
  WaypointStatsResult,

  // Document Management
  DocumentDetailResult,
  DocumentListResult,

  // Memory Management (pin, reinforce, penalize, schedule-forget)
  PinResult,
  ReinforceResult,
  PenalizeResult,
  ScheduleForgetResult,

  // Facts Cleanup & Contest
  CleanupFactsOptions,
  CleanupFactsResult,
  ContestFactResult,
  ResolveContestResult,

  // Organizations (enterprise)
  OrgRole,
  OrgInfo,
  OrgMember,
  CreateOrgResult,
  ListOrgsResult,
  GetOrgResult,
  InviteMemberResult,
  RemoveMemberResult,

  // Webhooks
  WebhookEventType,
  WebhookEndpoint,
  CreateWebhookResult,
  ListWebhooksResult,
  DeleteWebhookResult,
  TestWebhookResult,

  // Audit Logs
  AuditLogEntry,
  AuditLogOptions,
  AuditLogResult,

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
