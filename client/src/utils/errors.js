/**
 * EDOS Client-Side Error Utilities
 *
 * Consistent error handling for the frontend.
 */

/**
 * Error codes that map to user-friendly messages
 */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested item could not be found.',
  PROVIDER_ERROR: 'There was a problem connecting to the AI service.',
  CONFIG_ERROR: 'The server is not configured correctly.',
  CONFLICT: 'This action conflicts with the current state.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your connection.',
  TIMEOUT: 'The request took too long. Please try again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again later.',
};

/**
 * Parse an API error response into a consistent format
 */
export function parseApiError(error) {
  // Already parsed
  if (error.code && error.message) {
    return {
      message: error.message,
      code: error.code,
      details: error.details || null,
      userMessage: ERROR_MESSAGES[error.code] || error.message,
    };
  }

  // Network error (fetch failed)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network request failed',
      code: 'NETWORK_ERROR',
      details: null,
      userMessage: ERROR_MESSAGES.NETWORK_ERROR,
    };
  }

  // Standard Error object
  return {
    message: error.message || 'Unknown error',
    code: 'INTERNAL_ERROR',
    details: null,
    userMessage: error.message || ERROR_MESSAGES.INTERNAL_ERROR,
  };
}

/**
 * Check if an error is a specific type
 */
export function isErrorType(error, code) {
  return error?.code === code;
}

/**
 * Check if error is retryable (transient network/provider issues)
 */
export function isRetryable(error) {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'PROVIDER_ERROR'];
  return retryableCodes.includes(error?.code);
}

/**
 * Format error for display in toast/notification
 */
export function formatErrorForDisplay(error) {
  const parsed = parseApiError(error);

  // For validation errors, include field info if available
  if (parsed.code === 'VALIDATION_ERROR' && parsed.details?.field) {
    return `${parsed.details.field}: ${parsed.message}`;
  }

  return parsed.userMessage;
}

/**
 * Create a consistent error object for store actions
 */
export function createStoreError(message, code = 'INTERNAL_ERROR') {
  return {
    message,
    code,
    timestamp: Date.now(),
  };
}

/**
 * Retry helper for transient failures
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = isRetryable,
  } = options;

  let lastError;
  let delay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const parsed = parseApiError(error);

      if (attempt === maxRetries || !shouldRetry(parsed)) {
        throw error;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}

export default {
  ERROR_MESSAGES,
  parseApiError,
  isErrorType,
  isRetryable,
  formatErrorForDisplay,
  createStoreError,
  withRetry,
};
