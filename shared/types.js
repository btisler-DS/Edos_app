/**
 * EDOS Shared Types
 * These are conceptual type definitions for documentation purposes.
 * In a TypeScript migration, these would become actual types.
 */

/**
 * @typedef {Object} ModelProfile
 * @property {string} id
 * @property {string} name
 * @property {'anthropic' | 'openai'} provider
 * @property {string} model_id
 * @property {string} [system_prompt]
 * @property {Object} [parameters]
 * @property {boolean} is_active
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} [title]
 * @property {string} model_profile_id
 * @property {string} user_id
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} last_active_at
 * @property {string} [orientation_blurb]
 * @property {string} [unresolved_edge]
 * @property {string} [last_pivot]
 * @property {string} [metadata_generated_at]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} session_id
 * @property {'user' | 'assistant'} role
 * @property {string} content
 * @property {string} created_at
 */

/**
 * @typedef {Object} SessionMetadata
 * @property {string} id
 * @property {string} session_id
 * @property {string} [orientation_blurb]
 * @property {string} [unresolved_edge]
 * @property {string} [last_pivot]
 * @property {string} generated_at
 */

export {};
