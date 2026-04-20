"use strict";
/**
 * Hypersave SDK Custom Error Classes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = exports.ServerError = exports.NetworkError = exports.TimeoutError = exports.RateLimitError = exports.NotFoundError = exports.ValidationError = exports.AuthenticationError = exports.HypersaveError = void 0;
exports.createErrorFromStatus = createErrorFromStatus;
exports.isHypersaveError = isHypersaveError;
exports.isErrorType = isErrorType;
/**
 * Base error class for all Hypersave SDK errors
 */
class HypersaveError extends Error {
    /** HTTP status code if applicable */
    statusCode;
    /** Original error cause */
    cause;
    constructor(message, statusCode, cause) {
        super(message);
        this.name = 'HypersaveError';
        this.statusCode = statusCode;
        this.cause = cause;
        // Maintains proper stack trace for where error was thrown (V8 engines)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HypersaveError);
        }
    }
}
exports.HypersaveError = HypersaveError;
/**
 * Thrown when the API key is missing or invalid
 */
class AuthenticationError extends HypersaveError {
    constructor(message = 'Invalid or missing API key') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Thrown when the request parameters are invalid
 */
class ValidationError extends HypersaveError {
    /** Validation error details */
    details;
    constructor(message, details) {
        super(message, 400);
        this.name = 'ValidationError';
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
/**
 * Thrown when a requested resource is not found
 */
class NotFoundError extends HypersaveError {
    /** Resource type that was not found */
    resourceType;
    /** Resource ID that was not found */
    resourceId;
    constructor(message, resourceType, resourceId) {
        super(message, 404);
        this.name = 'NotFoundError';
        this.resourceType = resourceType;
        this.resourceId = resourceId;
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Thrown when rate limits are exceeded
 */
class RateLimitError extends HypersaveError {
    /** Time until rate limit resets (in seconds) */
    retryAfter;
    constructor(message = 'Rate limit exceeded', retryAfter) {
        super(message, 429);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Thrown when the request times out
 */
class TimeoutError extends HypersaveError {
    /** Timeout duration in milliseconds */
    timeout;
    constructor(timeout, message) {
        super(message || `Request timed out after ${timeout}ms`, 408);
        this.name = 'TimeoutError';
        this.timeout = timeout;
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Thrown when there's a network connectivity issue
 */
class NetworkError extends HypersaveError {
    constructor(message = 'Network connection failed', cause) {
        super(message, undefined, cause);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
/**
 * Thrown when the server returns an unexpected error
 */
class ServerError extends HypersaveError {
    constructor(message = 'Internal server error', statusCode = 500) {
        super(message, statusCode);
        this.name = 'ServerError';
    }
}
exports.ServerError = ServerError;
/**
 * Thrown when the API response is malformed or unexpected
 */
class ParseError extends HypersaveError {
    /** Raw response that couldn't be parsed */
    rawResponse;
    constructor(message = 'Failed to parse API response', rawResponse) {
        super(message, undefined);
        this.name = 'ParseError';
        this.rawResponse = rawResponse;
    }
}
exports.ParseError = ParseError;
/**
 * Helper to convert HTTP status codes to appropriate error types
 */
function createErrorFromStatus(statusCode, message, details) {
    switch (statusCode) {
        case 400:
            return new ValidationError(message, details);
        case 401:
        case 403:
            return new AuthenticationError(message);
        case 404:
            return new NotFoundError(message);
        case 429:
            return new RateLimitError(message, details?.retryAfter);
        case 408:
            return new TimeoutError(details?.timeout || 30000, message);
        case 500:
        case 502:
        case 503:
        case 504:
            return new ServerError(message, statusCode);
        default:
            return new HypersaveError(message, statusCode);
    }
}
/**
 * Type guard to check if an error is a HypersaveError
 */
function isHypersaveError(error) {
    return error instanceof HypersaveError;
}
/**
 * Type guard to check if an error is a specific Hypersave error type
 */
function isErrorType(error, errorClass) {
    return error instanceof errorClass;
}
//# sourceMappingURL=errors.js.map