/**
 * Hypersave SDK Custom Error Classes
 */
/**
 * Base error class for all Hypersave SDK errors
 */
export declare class HypersaveError extends Error {
    /** HTTP status code if applicable */
    readonly statusCode?: number;
    /** Original error cause */
    readonly cause?: Error;
    constructor(message: string, statusCode?: number, cause?: Error);
}
/**
 * Thrown when the API key is missing or invalid
 */
export declare class AuthenticationError extends HypersaveError {
    constructor(message?: string);
}
/**
 * Thrown when the request parameters are invalid
 */
export declare class ValidationError extends HypersaveError {
    /** Validation error details */
    readonly details?: Record<string, any>;
    constructor(message: string, details?: Record<string, any>);
}
/**
 * Thrown when a requested resource is not found
 */
export declare class NotFoundError extends HypersaveError {
    /** Resource type that was not found */
    readonly resourceType?: string;
    /** Resource ID that was not found */
    readonly resourceId?: string;
    constructor(message: string, resourceType?: string, resourceId?: string);
}
/**
 * Thrown when rate limits are exceeded
 */
export declare class RateLimitError extends HypersaveError {
    /** Time until rate limit resets (in seconds) */
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number);
}
/**
 * Thrown when the request times out
 */
export declare class TimeoutError extends HypersaveError {
    /** Timeout duration in milliseconds */
    readonly timeout: number;
    constructor(timeout: number, message?: string);
}
/**
 * Thrown when there's a network connectivity issue
 */
export declare class NetworkError extends HypersaveError {
    constructor(message?: string, cause?: Error);
}
/**
 * Thrown when the server returns an unexpected error
 */
export declare class ServerError extends HypersaveError {
    constructor(message?: string, statusCode?: number);
}
/**
 * Thrown when the API response is malformed or unexpected
 */
export declare class ParseError extends HypersaveError {
    /** Raw response that couldn't be parsed */
    readonly rawResponse?: string;
    constructor(message?: string, rawResponse?: string);
}
/**
 * Helper to convert HTTP status codes to appropriate error types
 */
export declare function createErrorFromStatus(statusCode: number, message: string, details?: Record<string, any>): HypersaveError;
/**
 * Type guard to check if an error is a HypersaveError
 */
export declare function isHypersaveError(error: unknown): error is HypersaveError;
/**
 * Type guard to check if an error is a specific Hypersave error type
 */
export declare function isErrorType<T extends HypersaveError>(error: unknown, errorClass: new (...args: any[]) => T): error is T;
//# sourceMappingURL=errors.d.ts.map