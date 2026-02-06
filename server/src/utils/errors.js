/**
 * EDOS Structured Error Types
 *
 * Consistent error handling across the application.
 * Each error type includes a code, status, and structured details.
 */

/**
 * Base error class for all EDOS errors
 */
export class EdosError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'EdosError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation errors - invalid user input
 */
export class ValidationError extends EdosError {
  constructor(message, details = null) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }

  static missingField(fieldName) {
    return new ValidationError(`Missing required field: ${fieldName}`, { field: fieldName });
  }

  static invalidFormat(fieldName, expected) {
    return new ValidationError(
      `Invalid format for ${fieldName}. Expected: ${expected}`,
      { field: fieldName, expected }
    );
  }

  static tooLong(fieldName, maxLength) {
    return new ValidationError(
      `${fieldName} exceeds maximum length of ${maxLength}`,
      { field: fieldName, maxLength }
    );
  }
}

/**
 * Not found errors - requested resource doesn't exist
 */
export class NotFoundError extends EdosError {
  constructor(resource, id = null) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }

  static session(id) {
    return new NotFoundError('Session', id);
  }

  static profile(id) {
    return new NotFoundError('Model profile', id);
  }

  static project(id) {
    return new NotFoundError('Project', id);
  }

  static context(id) {
    return new NotFoundError('Context', id);
  }

  static anchor(id) {
    return new NotFoundError('Anchor', id);
  }
}

/**
 * Provider errors - LLM API failures
 */
export class ProviderError extends EdosError {
  constructor(provider, message, originalError = null) {
    super(`[${provider}] ${message}`, 'PROVIDER_ERROR', 502, {
      provider,
      originalMessage: originalError?.message,
    });
    this.name = 'ProviderError';
    this.provider = provider;
    this.originalError = originalError;
  }

  static apiKeyMissing(provider) {
    return new ProviderError(provider, 'API key not configured');
  }

  static rateLimited(provider, retryAfter = null) {
    const error = new ProviderError(provider, 'Rate limit exceeded');
    error.retryAfter = retryAfter;
    return error;
  }

  static timeout(provider) {
    return new ProviderError(provider, 'Request timed out');
  }

  static streamError(provider, originalError) {
    return new ProviderError(provider, 'Streaming error', originalError);
  }
}

/**
 * Configuration errors - server misconfiguration
 */
export class ConfigError extends EdosError {
  constructor(message, details = null) {
    super(message, 'CONFIG_ERROR', 500, details);
    this.name = 'ConfigError';
  }

  static missingEnvVar(varName) {
    return new ConfigError(`Missing environment variable: ${varName}`, { variable: varName });
  }

  static noActiveProfile() {
    return new ConfigError('No active model profile configured');
  }
}

/**
 * Conflict errors - operation conflicts with current state
 */
export class ConflictError extends EdosError {
  constructor(message, details = null) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }

  static titleLocked(sessionId) {
    return new ConflictError('Cannot modify title of imported session', { sessionId });
  }

  static cyclicLink(fromId, toId) {
    return new ConflictError('Cannot create cyclic inquiry link', { fromId, toId });
  }

  static duplicateLink(fromId, toId) {
    return new ConflictError('Inquiry link already exists', { fromId, toId });
  }
}

/**
 * Forbidden errors - operation not allowed
 */
export class ForbiddenError extends EdosError {
  constructor(message, details = null) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * Database errors - SQLite failures
 */
export class DatabaseError extends EdosError {
  constructor(message, originalError = null) {
    super(message, 'DATABASE_ERROR', 500, {
      originalMessage: originalError?.message,
    });
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Express error handling middleware
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  console.error(`[${new Date().toISOString()}] ${err.name || 'Error'}:`, err.message);

  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Handle our custom errors
  if (err instanceof EdosError) {
    return res.status(err.status).json(err.toJSON());
  }

  // Handle unexpected errors
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async route handler wrapper - catches errors and passes to middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default {
  EdosError,
  ValidationError,
  NotFoundError,
  ProviderError,
  ConfigError,
  ConflictError,
  ForbiddenError,
  DatabaseError,
  errorHandler,
  asyncHandler,
};
