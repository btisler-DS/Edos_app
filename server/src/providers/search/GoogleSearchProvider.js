/**
 * Google Custom Search JSON API Provider
 *
 * Requires:
 * - GOOGLE_SEARCH_API_KEY environment variable
 * - GOOGLE_SEARCH_ENGINE_ID (cx) environment variable
 *
 * API Docs: https://developers.google.com/custom-search/v1/overview
 */

const GOOGLE_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';

export class GoogleSearchProvider {
  constructor(apiKey, searchEngineId) {
    if (!apiKey) {
      throw new Error('GOOGLE_SEARCH_API_KEY is required');
    }
    if (!searchEngineId) {
      throw new Error('GOOGLE_SEARCH_ENGINE_ID is required');
    }
    this.apiKey = apiKey;
    this.searchEngineId = searchEngineId;
    this.name = 'google';
  }

  /**
   * Execute a web search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @param {number} options.maxResults - Maximum number of results (default: 5, max: 10)
   * @returns {Promise<object[]>} Raw search results
   */
  async search(query, options = {}) {
    // Google CSE has a max of 10 results per request
    const maxResults = Math.min(options.maxResults || 5, 10);

    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: query,
      num: maxResults.toString(),
      safe: 'active',
    });

    const response = await fetch(`${GOOGLE_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract items from response
    const items = data.items || [];

    return items.map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayLink,
      // Google-specific metadata
      _raw: {
        kind: item.kind,
        htmlTitle: item.htmlTitle,
        htmlSnippet: item.htmlSnippet,
        formattedUrl: item.formattedUrl,
        pagemap: item.pagemap,
      },
    }));
  }

  /**
   * Get provider name
   */
  getName() {
    return this.name;
  }
}
