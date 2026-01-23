import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class AnchorService {
  /**
   * Create an anchor for a message
   */
  static create(sessionId, messageId, label) {
    const db = getDb();
    const id = generatePrefixedId('anc');
    const timestamp = now();

    db.prepare(`
      INSERT INTO anchors (id, session_id, message_id, label, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, sessionId, messageId, label, timestamp);

    return this.getById(id);
  }

  /**
   * Get anchor by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM anchors WHERE id = ?').get(id);
  }

  /**
   * Get all anchors for a session
   */
  static getBySessionId(sessionId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM anchors
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);
  }

  /**
   * Get anchor for a specific message (if exists)
   */
  static getByMessageId(messageId) {
    const db = getDb();
    return db.prepare('SELECT * FROM anchors WHERE message_id = ?').get(messageId);
  }

  /**
   * Delete an anchor
   */
  static delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM anchors WHERE id = ?').run(id);
    return true;
  }
}
