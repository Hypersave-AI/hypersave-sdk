/**
 * Hypersave SDK
 * Official TypeScript/JavaScript SDK for the Hypersave API
 *
 * @packageDocumentation
 */
export { HypersaveClient, default } from './client.js';
export type { HypersaveConfig, DocumentType, CategoryType, SectorType, SearchMode, SaveOptions, SaveResult, SaveStatus, AskOptions, AskResult, SearchOptions, SearchResult, QueryOptions, QueryResult, Memory, MemoriesResult, GetMemoriesOptions, Fact, ProfileResult, GraphNode, GraphEdge, GraphResult, RemindOptions, RemindResult, UsageResult, DeleteResult, ApiResponse, } from './types.js';
export { HypersaveError, AuthenticationError, ValidationError, NotFoundError, RateLimitError, TimeoutError, NetworkError, ServerError, ParseError, createErrorFromStatus, isHypersaveError, isErrorType, } from './errors.js';
//# sourceMappingURL=index.d.ts.map