import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';
import { ModelProfileService } from './ModelProfileService.js';

export class SessionService {
  /**
   * Get all sessions, ordered by last active
   * Includes first_assistant_snippet for hover preview fallback
   */
  static getAll() {
    const db = getDb();
    return db.prepare(`
      SELECT s.*,
             sm.orientation_blurb,
             sm.unresolved_edge,
             sm.last_pivot,
             sm.generated_at as metadata_generated_at,
             (SELECT SUBSTR(content, 1, 200)
              FROM messages
              WHERE session_id = s.id AND role = 'assistant'
              ORDER BY created_at ASC LIMIT 1) as first_assistant_snippet
      FROM sessions s
      LEFT JOIN session_metadata sm ON s.id = sm.session_id
      ORDER BY s.last_active_at DESC
    `).all();
  }

  /**
   * Get a session by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT s.*, sm.orientation_blurb, sm.unresolved_edge, sm.last_pivot, sm.generated_at as metadata_generated_at
      FROM sessions s
      LEFT JOIN session_metadata sm ON s.id = sm.session_id
      WHERE s.id = ?
    `).get(id);
  }

  /**
   * Create a new session using the active model profile
   */
  static create() {
    const db = getDb();
    const activeProfile = ModelProfileService.getActive();

    if (!activeProfile) {
      throw new Error('No active model profile. Please set one first.');
    }

    const id = generatePrefixedId('ses');
    const timestamp = now();

    db.prepare(`
      INSERT INTO sessions (id, model_profile_id, user_id, created_at, updated_at, last_active_at)
      VALUES (?, ?, 'default', ?, ?, ?)
    `).run(id, activeProfile.id, timestamp, timestamp, timestamp);

    return this.getById(id);
  }

  /**
   * Update session's last_active_at timestamp
   */
  static touch(id) {
    const db = getDb();
    const timestamp = now();
    db.prepare('UPDATE sessions SET last_active_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, id);
    return this.getById(id);
  }

  /**
   * Set session title (called after first assistant response)
   */
  static setTitle(id, title) {
    const db = getDb();
    db.prepare('UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now(), id);
    return this.getById(id);
  }

  /**
   * Get sessions that need metadata regeneration
   * Criteria:
   * - last_active_at > threshold ago
   * - AND (metadata doesn't exist OR metadata.generated_at < last_active_at)
   */
  static getSessionsNeedingMetadata(thresholdMs) {
    const db = getDb();
    const thresholdTime = new Date(Date.now() - thresholdMs).toISOString();

    return db.prepare(`
      SELECT s.*
      FROM sessions s
      LEFT JOIN session_metadata sm ON s.id = sm.session_id
      WHERE s.last_active_at < ?
      AND (sm.id IS NULL OR sm.generated_at < s.last_active_at)
    `).all(thresholdTime);
  }

  /**
   * Get the model profile for a session
   */
  static getModelProfile(sessionId) {
    const db = getDb();
    return db.prepare(`
      SELECT mp.*
      FROM model_profiles mp
      INNER JOIN sessions s ON s.model_profile_id = mp.id
      WHERE s.id = ?
    `).get(sessionId);
  }

  /**
   * Delete a session and all its messages/metadata
   */
  static delete(id) {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return true;
  }
}
