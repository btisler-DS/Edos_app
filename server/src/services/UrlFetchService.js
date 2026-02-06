/**
 * URL Fetch Service
 *
 * Fetches web pages and extracts readable content for context injection.
 * Content is treated as reference material, not truth.
 *
 * DESIGN INTENT (do not change without careful consideration):
 * ─────────────────────────────────────────────────────────────
 * URL fetching is INTENTIONAL, EXPLICIT, and USER-INITIATED.
 *
 * - User pastes a URL → Edos fetches it (like handing over a document)
 * - User does NOT paste a URL → Edos does NOT search the web
 *
 * This is NOT autonomous browsing. Do not generalize this into:
 * - Automatic "I'll look that up for you" behavior
 * - Background research triggered by topic detection
 * - Crawling or following links from fetched pages
 *
 * The user controls what enters the context. The fetched content is:
 * - Visible in the context bar
 * - Reviewable by the user
 * - Removable at any time
 *
 * This makes Edos a research assistant, not an oracle.
 * ─────────────────────────────────────────────────────────────
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { getDomain } from '../utils/urlParser.js';

// Simple in-memory cache for fetched URLs (same session)
const fetchCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export class UrlFetchService {
  /**
   * Fetch a URL and extract readable content
   * @param {string} url - URL to fetch
   * @param {object} options - Fetch options
   * @returns {Promise<{success: boolean, title: string, content: string, url: string, error?: string}>}
   */
  static async fetch(url, options = {}) {
    // Check cache first
    const cached = this._getFromCache(url);
    if (cached && !options.bypassCache) {
      console.log(`[UrlFetch] Cache hit for: ${url}`);
      return cached;
    }

    try {
      console.log(`[UrlFetch] Fetching: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Edos/1.0; +https://github.com/edos)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });

      if (!response.ok) {
        return {
          success: false,
          url,
          title: getDomain(url),
          content: '',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';

      // Handle non-HTML content
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        // For PDFs and other documents, just note that we can't extract
        if (contentType.includes('application/pdf')) {
          return {
            success: false,
            url,
            title: getDomain(url),
            content: '',
            error: 'PDF content - cannot extract text directly',
          };
        }

        // For plain text, return as-is
        if (contentType.includes('text/plain')) {
          const text = await response.text();
          const result = {
            success: true,
            url,
            title: getDomain(url),
            content: text.slice(0, 50000), // Limit size
          };
          this._addToCache(url, result);
          return result;
        }

        return {
          success: false,
          url,
          title: getDomain(url),
          content: '',
          error: `Unsupported content type: ${contentType}`,
        };
      }

      const html = await response.text();

      // Use Readability to extract main content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent) {
        // Fallback: extract text from body
        const fallbackText = this._extractFallbackText(dom.window.document);
        const result = {
          success: true,
          url,
          title: dom.window.document.title || getDomain(url),
          content: fallbackText,
        };
        this._addToCache(url, result);
        return result;
      }

      const result = {
        success: true,
        url,
        title: article.title || dom.window.document.title || getDomain(url),
        content: article.textContent.trim(),
        byline: article.byline,
        excerpt: article.excerpt,
      };

      this._addToCache(url, result);
      return result;

    } catch (error) {
      console.error(`[UrlFetch] Error fetching ${url}:`, error.message);
      return {
        success: false,
        url,
        title: getDomain(url),
        content: '',
        error: error.message,
      };
    }
  }

  /**
   * Fetch multiple URLs
   * @param {string[]} urls
   * @returns {Promise<object[]>}
   */
  static async fetchMultiple(urls) {
    return Promise.all(urls.map(url => this.fetch(url)));
  }

  /**
   * Format fetched content for LLM context
   * @param {object} fetchResult
   * @returns {string}
   */
  static formatForContext(fetchResult) {
    if (!fetchResult.success) {
      return `--- Web Page: ${fetchResult.url} ---
Failed to fetch: ${fetchResult.error}
--- End of Web Page ---`;
    }

    // Truncate very long content
    let content = fetchResult.content;
    if (content.length > 15000) {
      content = content.slice(0, 15000) + '\n\n[Content truncated - page too long]';
    }

    return `--- Web Page: ${fetchResult.title} ---
Source: ${fetchResult.url}
Retrieved: ${new Date().toISOString()}

${content}

--- End of Web Page ---`;
  }

  /**
   * Format multiple results for context
   * @param {object[]} results
   * @returns {string}
   */
  static formatMultipleForContext(results) {
    return results.map(r => this.formatForContext(r)).join('\n\n');
  }

  /**
   * Fallback text extraction when Readability fails
   */
  static _extractFallbackText(document) {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, footer, header');
    scripts.forEach(el => el.remove());

    // Get body text
    const body = document.body;
    if (!body) return '';

    let text = body.textContent || '';

    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return text.slice(0, 30000); // Limit size
  }

  /**
   * Cache management
   */
  static _getFromCache(url) {
    const entry = fetchCache.get(url);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      fetchCache.delete(url);
      return null;
    }
    return entry.result;
  }

  static _addToCache(url, result) {
    fetchCache.set(url, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  static clearCache() {
    fetchCache.clear();
  }
}
