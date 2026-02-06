import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class ContextService {
  /**
   * Add context to a session (from file upload)
   */
  static addFileContext(sessionId, sourceName, content) {
    const db = getDb();
    const id = generatePrefixedId('ctx');
    const timestamp = now();

    db.prepare(`
      INSERT INTO session_context (id, session_id, source_type, source_name, content, created_at)
      VALUES (?, ?, 'file_upload', ?, ?, ?)
    `).run(id, sessionId, sourceName, content, timestamp);

    return this.getById(id);
  }

  /**
   * Add assembled context from prior sessions
   */
  static addAssembledContext(sessionId, content, sourceSessionTitles) {
    const db = getDb();
    const id = generatePrefixedId('ctx');
    const timestamp = now();
    const sourceName = `Prior Inquiries: ${sourceSessionTitles.join(', ')}`;

    db.prepare(`
      INSERT INTO session_context (id, session_id, source_type, source_name, content, created_at)
      VALUES (?, ?, 'assembled_sessions', ?, ?, ?)
    `).run(id, sessionId, sourceName, content, timestamp);

    return this.getById(id);
  }

  /**
   * Add web search results as context
   * @param {string} sessionId - Session ID
   * @param {string} query - The search query
   * @param {object[]} results - Normalized search results
   * @param {string} formattedContent - Pre-formatted content for LLM
   */
  static addWebSearchContext(sessionId, query, results, formattedContent) {
    const db = getDb();
    const id = generatePrefixedId('ctx');
    const timestamp = now();
    const sourceName = `Web Search: "${query}"`;

    db.prepare(`
      INSERT INTO session_context (id, session_id, source_type, source_name, content, created_at)
      VALUES (?, ?, 'web_search', ?, ?, ?)
    `).run(id, sessionId, sourceName, formattedContent, timestamp);

    return this.getById(id);
  }

  /**
   * Add fetched URL content as context
   * @param {string} sessionId - Session ID
   * @param {string} url - The source URL
   * @param {string} title - Page title
   * @param {string} formattedContent - Pre-formatted content for LLM
   */
  static addUrlFetchContext(sessionId, url, title, formattedContent) {
    const db = getDb();
    const id = generatePrefixedId('ctx');
    const timestamp = now();
    const sourceName = title || url;

    db.prepare(`
      INSERT INTO session_context (id, session_id, source_type, source_name, content, created_at)
      VALUES (?, ?, 'url_fetch', ?, ?, ?)
    `).run(id, sessionId, sourceName, formattedContent, timestamp);

    return this.getById(id);
  }

  /**
   * Get context by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM session_context WHERE id = ?').get(id);
  }

  /**
   * Get all context for a session
   */
  static getBySessionId(sessionId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM session_context
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);
  }

  /**
   * Delete a context item by ID
   */
  static delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM session_context WHERE id = ?').run(id);
    return true;
  }

  /**
   * Delete all context for a session
   */
  static deleteAllForSession(sessionId) {
    const db = getDb();
    const result = db.prepare('DELETE FROM session_context WHERE session_id = ?').run(sessionId);
    return result.changes;
  }

  /**
   * Get formatted context string for LLM inclusion
   */
  static getFormattedContext(sessionId) {
    const contexts = this.getBySessionId(sessionId);

    if (contexts.length === 0) {
      return null;
    }

    return contexts.map(ctx => {
      if (ctx.source_type === 'assembled_sessions') {
        // Assembled context already formatted
        return ctx.content;
      }
      if (ctx.source_type === 'web_search') {
        // Web search context is pre-formatted with attribution
        // Already includes --- Web Search Results --- markers
        return ctx.content;
      }
      if (ctx.source_type === 'url_fetch') {
        // URL fetch context is pre-formatted with source attribution
        // Already includes --- Web Page --- markers
        return ctx.content;
      }
      // File upload context
      const header = `--- Reference Document: ${ctx.source_name} ---`;
      return `${header}\n\n${ctx.content}\n\n--- End of ${ctx.source_name} ---`;
    }).join('\n\n');
  }
}
