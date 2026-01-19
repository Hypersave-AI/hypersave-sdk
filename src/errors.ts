/**
 * Hypersave SDK Custom Error Classes
 */

/**
 * Base error class for all Hypersave SDK errors
 */
export class HypersaveError extends Error {
  /** HTTP status code if applicable */
  public readonly statusCode?: number;
  /** Original error cause */
  public readonly cause?: Error;

  constructor(message: string, statusCode?: number, cause?: Error) {
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

/**
 * Thrown when the API key is missing or invalid
 */
export class AuthenticationError extends HypersaveError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the request parameters are invalid
 */
export class ValidationError extends HypersaveError {
  /** Validation error details */
  public readonly details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends HypersaveError {
  /** Resource type that was not found */
  public readonly resourceType?: string;
  /** Resource ID that was not found */
  public readonly resourceId?: string;

  constructor(message: string, resourceType?: string, resourceId?: string) {
    super(message, 404);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Thrown when rate limits are exceeded
 */
export class RateLimitError extends HypersaveError {
  /** Time until rate limit resets (in seconds) */
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the request times out
 */
export class TimeoutError extends HypersaveError {
  /** Timeout duration in milliseconds */
  public readonly timeout: number;

  constructor(timeout: number, message?: string) {
    super(message || `Request timed out after ${timeout}ms`, 408);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Thrown when there's a network connectivity issue
 */
export class NetworkError extends HypersaveError {
  constructor(message: string = 'Network connection failed', cause?: Error) {
    super(message, undefined, cause);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown when the server returns an unexpected error
 */
export class ServerError extends HypersaveError {
  constructor(message: string = 'Internal server error', statusCode: number = 500) {
    super(message, statusCode);
    this.name = 'ServerError';
  }
}

/**
 * Thrown when the API response is malformed or unexpected
 */
export class ParseError extends HypersaveError {
  /** Raw response that couldn't be parsed */
  public readonly rawResponse?: string;

  constructor(message: string = 'Failed to parse API response', rawResponse?: string) {
    super(message, undefined);
    this.name = 'ParseError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Helper to convert HTTP status codes to appropriate error types
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string,
  details?: Record<string, any>
): HypersaveError {
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
export function isHypersaveError(error: unknown): error is HypersaveError {
  return error instanceof HypersaveError;
}

/**
 * Type guard to check if an error is a specific Hypersave error type
 */
export function isErrorType<T extends HypersaveError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}
