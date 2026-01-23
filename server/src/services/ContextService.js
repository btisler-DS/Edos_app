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
   * Get formatted context string for LLM inclusion
   */
  static getFormattedContext(sessionId) {
    const contexts = this.getBySessionId(sessionId);

    if (contexts.length === 0) {
      return null;
    }

    return contexts.map(ctx => {
      const header = `--- Reference Document: ${ctx.source_name} ---`;
      return `${header}\n\n${ctx.content}\n\n--- End of ${ctx.source_name} ---`;
    }).join('\n\n');
  }
}
