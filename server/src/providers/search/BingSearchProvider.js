/**
 * Bing Web Search API v7 Provider
 *
 * Requires BING_SEARCH_API_KEY environment variable
 * API Docs: https://docs.microsoft.com/en-us/bing/search-apis/bing-web-search/overview
 */

const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

export class BingSearchProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('BING_SEARCH_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.name = 'bing';
  }

  /**
   * Execute a web search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @param {number} options.maxResults - Maximum number of results (default: 5)
   * @returns {Promise<object[]>} Raw search results
   */
  async search(query, options = {}) {
    const maxResults = options.maxResults || 5;

    const params = new URLSearchParams({
      q: query,
      count: maxResults.toString(),
      responseFilter: 'Webpages',
      textFormat: 'Raw',
      safeSearch: 'Moderate',
    });

    const response = await fetch(`${BING_ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bing API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract web pages from response
    const webPages = data.webPages?.value || [];

    return webPages.map(page => ({
      title: page.name,
      url: page.url,
      snippet: page.snippet,
      displayUrl: page.displayUrl,
      dateLastCrawled: page.dateLastCrawled,
      // Bing-specific metadata
      _raw: {
        id: page.id,
        language: page.language,
        isFamilyFriendly: page.isFamilyFriendly,
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
