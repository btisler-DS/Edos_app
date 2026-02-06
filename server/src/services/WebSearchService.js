/**
 * Web Search Service
 *
 * Orchestrates web search operations with caching, normalization, and formatting.
 * Search results are evidence, not truth - always include attribution.
 */

import { searchCache } from '../utils/searchCache.js';
import { getSearchProviderFromEnv, isWebSearchAvailable } from '../providers/search/index.js';
import { WEB_SEARCH } from '../config/constants.js';

export class WebSearchService {
  /**
   * Execute a web search with caching
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @param {number} options.maxResults - Max results (default from config)
   * @param {boolean} options.bypassCache - Skip cache lookup
   * @returns {Promise<object[]>} Normalized search results
   */
  static async search(query, options = {}) {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required');
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new Error('Search query cannot be empty');
    }

    const maxResults = options.maxResults || WEB_SEARCH.maxResults;
    const cacheOptions = { maxResults, provider: process.env.WEB_SEARCH_PROVIDER || 'bing' };

    // Check cache first (unless bypassed)
    if (!options.bypassCache) {
      const cached = searchCache.get(trimmedQuery, cacheOptions);
      if (cached) {
        console.log(`[WebSearch] Cache hit for: "${trimmedQuery}"`);
        return cached;
      }
    }

    // Get provider
    const provider = getSearchProviderFromEnv();
    if (!provider) {
      throw new Error('No search provider configured');
    }

    console.log(`[WebSearch] Executing search via ${provider.getName()}: "${trimmedQuery}"`);

    // Execute search
    const rawResults = await provider.search(trimmedQuery, { maxResults });

    // Normalize results
    const normalizedResults = this.normalizeResults(rawResults, provider.getName());

    // Cache results
    searchCache.set(trimmedQuery, normalizedResults, cacheOptions);

    return normalizedResults;
  }

  /**
   * Normalize raw search results to common format
   * @param {object[]} rawResults - Provider-specific results
   * @param {string} providerName - Name of the search provider
   * @returns {object[]} Normalized results
   */
  static normalizeResults(rawResults, providerName) {
    return rawResults.map((result, index) => ({
      rank: index + 1,
      title: result.title || 'Untitled',
      snippet: result.snippet || '',
      url: result.url,
      displayUrl: result.displayUrl || result.url,
      provider: providerName,
      retrievedAt: new Date().toISOString(),
    }));
  }

  /**
   * Format search results for LLM context injection
   * @param {object[]} results - Normalized search results
   * @param {string} query - The original search query
   * @returns {string} Formatted text block for LLM
   */
  static formatForContext(results, query) {
    if (!results || results.length === 0) {
      return `--- Web Search Results: "${query}" ---\n\nNo results found.\n\n--- End of Web Search ---`;
    }

    const formattedResults = results.map((r, i) => {
      return `${i + 1}. Title: "${r.title}"\n   Snippet: "${r.snippet}"\n   URL: ${r.url}`;
    }).join('\n\n');

    return `--- Web Search Results: "${query}" ---

${formattedResults}

Cite sources when using this information.
--- End of Web Search ---`;
  }

  /**
   * Format results for database storage (JSON)
   * @param {object[]} results - Normalized search results
   * @param {string} query - The original search query
   * @returns {string} JSON string for storage
   */
  static formatForStorage(results, query) {
    return JSON.stringify({
      query,
      resultCount: results.length,
      retrievedAt: new Date().toISOString(),
      results: results.map(r => ({
        rank: r.rank,
        title: r.title,
        snippet: r.snippet,
        url: r.url,
      })),
    });
  }

  /**
   * Check if web search feature is available
   * @returns {boolean}
   */
  static isAvailable() {
    return isWebSearchAvailable();
  }

  /**
   * Check if web search is enabled
   * @returns {boolean}
   */
  static isEnabled() {
    return WEB_SEARCH.enabled || process.env.WEB_SEARCH_ENABLED === 'true';
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  static getCacheStats() {
    return searchCache.getStats();
  }

  /**
   * Clear the search cache
   */
  static clearCache() {
    searchCache.clear();
  }
}
