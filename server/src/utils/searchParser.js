/**
 * Parser for @edos search commands in message content
 *
 * Syntax: @edos search: "query text"
 * - Case insensitive
 * - Whitespace tolerant
 * - Quotes required around query
 */

// Main regex pattern for search command
// Matches: @edos search: "query here"
const SEARCH_PATTERN = /@edos\s+search:\s*"([^"]+)"/i;

/**
 * Parse message content for search commands
 * @param {string} content - The raw message content
 * @returns {{hasSearch: boolean, query: string|null, cleanedContent: string}}
 */
export function parseSearchCommand(content) {
  if (!content || typeof content !== 'string') {
    return {
      hasSearch: false,
      query: null,
      cleanedContent: content || '',
    };
  }

  const match = content.match(SEARCH_PATTERN);

  if (!match) {
    return {
      hasSearch: false,
      query: null,
      cleanedContent: content,
    };
  }

  const query = match[1].trim();

  // Remove the search command from the content
  // Also remove any leading/trailing whitespace that results
  const cleanedContent = content
    .replace(SEARCH_PATTERN, '')
    .replace(/^\s+|\s+$/g, '')  // Trim
    .replace(/\s{2,}/g, ' ');   // Collapse multiple spaces

  return {
    hasSearch: true,
    query: query || null,
    cleanedContent,
  };
}

/**
 * Check if content contains a search command
 * @param {string} content
 * @returns {boolean}
 */
export function hasSearchCommand(content) {
  return SEARCH_PATTERN.test(content);
}

/**
 * Extract just the search query from content
 * @param {string} content
 * @returns {string|null}
 */
export function extractSearchQuery(content) {
  const result = parseSearchCommand(content);
  return result.query;
}
