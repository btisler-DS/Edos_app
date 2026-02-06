/**
 * EDOS Input Validation Utilities
 *
 * Lightweight validation without external dependencies.
 * Use with asyncHandler for consistent error handling.
 */

import { ValidationError } from './errors.js';

/**
 * Validation rules - each returns true if valid, or throws ValidationError
 */
export const rules = {
  required: (value, field) => {
    if (value === undefined || value === null || value === '') {
      throw ValidationError.missingField(field);
    }
    return true;
  },

  string: (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw ValidationError.invalidFormat(field, 'string');
    }
    return true;
  },

  number: (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'number') {
      throw ValidationError.invalidFormat(field, 'number');
    }
    return true;
  },

  boolean: (value, field) => {
    if (value !== undefined && value !== null && typeof value !== 'boolean' && value !== 0 && value !== 1) {
      throw ValidationError.invalidFormat(field, 'boolean');
    }
    return true;
  },

  maxLength: (max) => (value, field) => {
    if (typeof value === 'string' && value.length > max) {
      throw ValidationError.tooLong(field, max);
    }
    return true;
  },

  minLength: (min) => (value, field) => {
    if (typeof value === 'string' && value.length < min) {
      throw new ValidationError(`${field} must be at least ${min} characters`, { field, minLength: min });
    }
    return true;
  },

  pattern: (regex, description) => (value, field) => {
    if (typeof value === 'string' && !regex.test(value)) {
      throw ValidationError.invalidFormat(field, description);
    }
    return true;
  },

  oneOf: (options) => (value, field) => {
    if (value !== undefined && value !== null && !options.includes(value)) {
      throw new ValidationError(
        `${field} must be one of: ${options.join(', ')}`,
        { field, allowed: options }
      );
    }
    return true;
  },

  // UUID pattern (ses-, msg-, prof-, etc.)
  prefixedId: (prefix) => (value, field) => {
    if (value !== undefined && value !== null) {
      const pattern = new RegExp(`^${prefix}-[a-f0-9-]{36}$`);
      if (!pattern.test(value)) {
        throw ValidationError.invalidFormat(field, `${prefix}-<uuid>`);
      }
    }
    return true;
  },

  // ISO date string
  isoDate: (value, field) => {
    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw ValidationError.invalidFormat(field, 'ISO 8601 date');
      }
    }
    return true;
  },
};

/**
 * Create a validator function from a schema
 *
 * Schema format:
 * {
 *   fieldName: [rule1, rule2, ...],
 *   'nested.field': [rule1, ...],
 * }
 */
export function createValidator(schema) {
  return (data) => {
    const errors = [];

    for (const [field, fieldRules] of Object.entries(schema)) {
      // Support nested fields like 'body.content'
      const value = field.split('.').reduce((obj, key) => obj?.[key], data);

      for (const rule of fieldRules) {
        try {
          rule(value, field);
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(error);
            break; // Stop at first error for this field
          }
          throw error;
        }
      }
    }

    if (errors.length > 0) {
      // Combine all errors into one
      const message = errors.map(e => e.message).join('; ');
      const details = errors.map(e => e.details);
      throw new ValidationError(message, { fields: details });
    }

    return true;
  };
}

/**
 * Express middleware factory for request validation
 */
export function validateRequest(schema) {
  const validate = createValidator(schema);

  return (req, res, next) => {
    try {
      validate({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export function sanitizeString(str, options = {}) {
  if (typeof str !== 'string') return str;

  let sanitized = str;

  // Trim whitespace
  if (options.trim !== false) {
    sanitized = sanitized.trim();
  }

  // Limit length
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Remove null bytes (potential security issue)
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Sanitize request body - apply sanitization to all string fields
 */
export function sanitizeBody(options = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body, options);
    }
    next();
  };
}

function sanitizeObject(obj, options) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value, options);
    }
    return result;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }

  return obj;
}

// ==================== Pre-built Schemas ====================

/**
 * Common validation schemas for routes
 */
export const schemas = {
  // POST /api/sessions/:sessionId/messages
  sendMessage: {
    'body.content': [rules.required, rules.string, rules.maxLength(100000)],
  },

  // PUT /api/sessions/:id
  updateSession: {
    'body.title': [rules.string, rules.maxLength(200)],
    'body.pinned': [rules.boolean],
    'body.archived': [rules.boolean],
  },

  // POST /api/profiles
  createProfile: {
    'body.name': [rules.required, rules.string, rules.maxLength(100)],
    'body.provider': [rules.required, rules.oneOf(['anthropic', 'openai'])],
    'body.model_id': [rules.required, rules.string],
  },

  // POST /api/projects
  createProject: {
    'body.name': [rules.required, rules.string, rules.maxLength(100)],
    'body.description': [rules.string, rules.maxLength(500)],
  },

  // POST /api/anchors
  createAnchor: {
    'body.messageId': [rules.required, rules.string],
    'body.label': [rules.required, rules.string, rules.maxLength(100)],
  },

  // POST /api/inquiry-links
  createInquiryLink: {
    'body.fromSessionId': [rules.required, rules.string],
    'body.toSessionId': [rules.required, rules.string],
    'body.note': [rules.string, rules.maxLength(500)],
  },

  // POST /api/search/keyword
  searchKeyword: {
    'query.q': [rules.required, rules.string, rules.maxLength(200)],
  },
};

export default {
  rules,
  createValidator,
  validateRequest,
  sanitizeString,
  sanitizeBody,
  schemas,
};
