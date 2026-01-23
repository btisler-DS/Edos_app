import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new UUID for entities
 */
export function generateId() {
  return uuidv4();
}

/**
 * Generate a prefixed ID for debugging clarity
 * @param {string} prefix - Entity prefix (e.g., 'ses', 'msg', 'prof')
 */
export function generatePrefixedId(prefix) {
  return `${prefix}_${uuidv4()}`;
}
