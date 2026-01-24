import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class InquiryLinkService {
  /**
   * Create an explicit link between two inquiries
   * @param {string} fromSessionId - The source session (earlier in time)
   * @param {string} toSessionId - The destination session (later in time)
   * @param {string} [note] - Optional user-authored explanation
   * @returns {object} The created link
   */
  static create(fromSessionId, toSessionId, note = null) {
    const db = getDb();

    // Prevent self-links
    if (fromSessionId === toSessionId) {
      throw new Error('Cannot link a session to itself');
    }

    // Check for circular links (would create A -> B -> A)
    const wouldCreateCycle = this.wouldCreateCycle(fromSessionId, toSessionId);
    if (wouldCreateCycle) {
      throw new Error('Cannot create circular link');
    }

    const id = generatePrefixedId('link');
    const timestamp = now();

    db.prepare(`
      INSERT INTO inquiry_links (id, from_session_id, to_session_id, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, fromSessionId, toSessionId, note, timestamp);

    return this.getById(id);
  }

  /**
   * Get a link by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM inquiry_links WHERE id = ?').get(id);
  }

  /**
   * Get all links for a session (both incoming and outgoing)
   * @param {string} sessionId
   * @returns {{ incoming: object[], outgoing: object[] }}
   */
  static getBySessionId(sessionId) {
    const db = getDb();

    // Get incoming links (sessions that continue TO this one)
    const incoming = db.prepare(`
      SELECT il.*, s.title as from_session_title
      FROM inquiry_links il
      JOIN sessions s ON il.from_session_id = s.id
      WHERE il.to_session_id = ?
      ORDER BY il.created_at ASC
    `).all(sessionId);

    // Get outgoing links (sessions that this one continues TO)
    const outgoing = db.prepare(`
      SELECT il.*, s.title as to_session_title
      FROM inquiry_links il
      JOIN sessions s ON il.to_session_id = s.id
      WHERE il.from_session_id = ?
      ORDER BY il.created_at ASC
    `).all(sessionId);

    return { incoming, outgoing };
  }

  /**
   * Get the full chain of ancestors for a session
   * @param {string} sessionId
   * @returns {object[]} Array of sessions in chronological order (oldest first)
   */
  static getAncestorChain(sessionId) {
    const db = getDb();
    const chain = [];
    const visited = new Set();
    let currentId = sessionId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      // Find the immediate parent (session that this continues from)
      const link = db.prepare(`
        SELECT il.from_session_id, s.id, s.title, s.created_at
        FROM inquiry_links il
        JOIN sessions s ON il.from_session_id = s.id
        WHERE il.to_session_id = ?
        ORDER BY il.created_at DESC
        LIMIT 1
      `).get(currentId);

      if (link) {
        chain.unshift({
          id: link.id,
          title: link.title,
          created_at: link.created_at,
        });
        currentId = link.from_session_id;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Delete a link by ID
   * @param {string} id
   * @returns {boolean}
   */
  static delete(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM inquiry_links WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Check if creating a link would create a cycle
   * @param {string} fromSessionId
   * @param {string} toSessionId
   * @returns {boolean}
   */
  static wouldCreateCycle(fromSessionId, toSessionId) {
    const db = getDb();
    const visited = new Set();
    let currentId = fromSessionId;

    // Walk backwards from fromSessionId to see if we ever reach toSessionId
    while (currentId && !visited.has(currentId)) {
      if (currentId === toSessionId) {
        return true; // Would create a cycle
      }
      visited.add(currentId);

      // Find parent
      const link = db.prepare(`
        SELECT from_session_id FROM inquiry_links
        WHERE to_session_id = ?
        LIMIT 1
      `).get(currentId);

      currentId = link?.from_session_id || null;
    }

    return false;
  }
}
