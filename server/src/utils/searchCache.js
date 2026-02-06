/**
 * Simple TTL cache for web search results
 * Map-based, in-memory only, no persistence
 */

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

class SearchCache {
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.cache = new Map();
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a cache key from query and options
   */
  _generateKey(query, options = {}) {
    const normalized = query.toLowerCase().trim();
    const optStr = JSON.stringify({
      maxResults: options.maxResults,
      provider: options.provider,
    });
    return `${normalized}::${optStr}`;
  }

  /**
   * Get cached results if not expired
   * @param {string} query
   * @param {object} options
   * @returns {object[]|null} Cached results or null if not found/expired
   */
  get(query, options = {}) {
    const key = this._generateKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  /**
   * Store results in cache
   * @param {string} query
   * @param {object[]} results
   * @param {object} options
   */
  set(query, results, options = {}) {
    const key = this._generateKey(query, options);
    this.cache.set(key, {
      results,
      expiresAt: Date.now() + this.ttlMs,
      cachedAt: Date.now(),
    });
  }

  /**
   * Check if a query is cached and not expired
   */
  has(query, options = {}) {
    return this.get(query, options) !== null;
  }

  /**
   * Clear all cached entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Remove expired entries (maintenance)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.cleanup(); // Clean up expired entries first
    return {
      size: this.cache.size,
      ttlMs: this.ttlMs,
    };
  }
}

// Export singleton instance
export const searchCache = new SearchCache();

// Export class for testing or custom instances
export { SearchCache };
