/**
 * URL Detection and Parsing Utility
 *
 * Detects URLs in message content for automatic fetching.
 */

// Regex to match URLs (http, https)
const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

/**
 * Extract all URLs from content
 * @param {string} content - Message content
 * @returns {string[]} Array of URLs found
 */
export function extractUrls(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const matches = content.match(URL_PATTERN);
  if (!matches) {
    return [];
  }

  // Clean up URLs (remove trailing punctuation that might have been captured)
  return matches.map(url => {
    // Remove trailing punctuation that's likely not part of the URL
    return url.replace(/[.,;:!?)]+$/, '');
  }).filter((url, index, self) => {
    // Remove duplicates
    return self.indexOf(url) === index;
  });
}

/**
 * Check if content contains any URLs
 * @param {string} content
 * @returns {boolean}
 */
export function hasUrls(content) {
  return extractUrls(content).length > 0;
}

/**
 * Get domain from URL for display
 * @param {string} url
 * @returns {string}
 */
export function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
