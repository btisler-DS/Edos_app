import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';
import { MAX_CONTEXT_MESSAGES } from '../config/constants.js';

export class MessageService {
  /**
   * Get all messages for a session, ordered by creation time
   */
  static getBySessionId(sessionId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);
  }

  /**
   * Get messages formatted for LLM context (with truncation if needed)
   * Filters out system messages as they're for UI display only
   */
  static getContextMessages(sessionId, limit = MAX_CONTEXT_MESSAGES) {
    const db = getDb();
    const messages = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ? AND role != 'system'
      ORDER BY created_at ASC
    `).all(sessionId);

    // If we have more messages than the limit, truncate from the beginning
    if (messages.length > limit) {
      const truncated = messages.slice(-limit);
      return {
        messages: truncated,
        truncated: true,
        originalCount: messages.length,
      };
    }

    return {
      messages,
      truncated: false,
      originalCount: messages.length,
    };
  }

  /**
   * Add a user message
   */
  static addUserMessage(sessionId, content) {
    return this._addMessage(sessionId, 'user', content);
  }

  /**
   * Add an assistant message
   */
  static addAssistantMessage(sessionId, content) {
    return this._addMessage(sessionId, 'assistant', content);
  }

  /**
   * Add a system message (for document uploads, events, etc.)
   */
  static addSystemMessage(sessionId, content) {
    return this._addMessage(sessionId, 'system', content);
  }

  /**
   * Internal method to add a message
   */
  static _addMessage(sessionId, role, content) {
    const db = getDb();
    const id = generatePrefixedId('msg');
    const timestamp = now();

    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, role, content, timestamp);

    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  }

  /**
   * Get message count for a session
   */
  static getCount(sessionId) {
    const db = getDb();
    const result = db.prepare('SELECT COUNT(*) as count FROM messages WHERE session_id = ?').get(sessionId);
    return result.count;
  }

  /**
   * Get the first exchange (first user + assistant message) for title generation
   */
  static getFirstExchange(sessionId) {
    const db = getDb();
    const messages = db.prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT 2
    `).all(sessionId);

    return messages;
  }

  /**
   * Get a compressed summary of session content for metadata generation
   */
  static getSessionContentForMetadata(sessionId) {
    const messages = this.getBySessionId(sessionId);

    // Format as a readable conversation
    return messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
  }
}
