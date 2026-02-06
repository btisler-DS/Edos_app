/**
 * Search Provider Factory
 *
 * Creates search providers based on configuration.
 * Supports Bing and Google search APIs.
 */

import { BingSearchProvider } from './BingSearchProvider.js';
import { GoogleSearchProvider } from './GoogleSearchProvider.js';

/**
 * Create a search provider by name
 * @param {string} providerName - 'bing' or 'google'
 * @param {object} config - Provider-specific configuration
 * @returns {BingSearchProvider|GoogleSearchProvider}
 */
export function getSearchProvider(providerName, config = {}) {
  const name = providerName?.toLowerCase() || 'bing';

  switch (name) {
    case 'bing':
      return new BingSearchProvider(config.apiKey);

    case 'google':
      return new GoogleSearchProvider(config.apiKey, config.searchEngineId);

    default:
      throw new Error(`Unknown search provider: ${providerName}`);
  }
}

/**
 * Create a search provider from environment variables
 * @param {string} [providerOverride] - Override the default provider
 * @returns {BingSearchProvider|GoogleSearchProvider|null}
 */
export function getSearchProviderFromEnv(providerOverride = null) {
  const providerName = providerOverride || process.env.WEB_SEARCH_PROVIDER || 'bing';

  switch (providerName.toLowerCase()) {
    case 'bing': {
      const apiKey = process.env.BING_SEARCH_API_KEY;
      if (!apiKey) {
        console.warn('BING_SEARCH_API_KEY not set - Bing search unavailable');
        return null;
      }
      return new BingSearchProvider(apiKey);
    }

    case 'google': {
      const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      if (!apiKey || !searchEngineId) {
        console.warn('GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not set - Google search unavailable');
        return null;
      }
      return new GoogleSearchProvider(apiKey, searchEngineId);
    }

    default:
      console.warn(`Unknown search provider: ${providerName}`);
      return null;
  }
}

/**
 * Check if web search is enabled and configured
 * @returns {boolean}
 */
export function isWebSearchAvailable() {
  const enabled = process.env.WEB_SEARCH_ENABLED === 'true';
  if (!enabled) return false;

  const provider = getSearchProviderFromEnv();
  return provider !== null;
}

// Export provider classes for direct use
export { BingSearchProvider } from './BingSearchProvider.js';
export { GoogleSearchProvider } from './GoogleSearchProvider.js';
