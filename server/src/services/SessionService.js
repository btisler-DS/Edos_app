import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';
import { ModelProfileService } from './ModelProfileService.js';
import { ContextService } from './ContextService.js';
import { ProjectService } from './ProjectService.js';
import { MessageService } from './MessageService.js';
import { InquiryLinkService } from './InquiryLinkService.js';

export class SessionService {
  /**
   * Get all sessions, ordered by last active
   * Includes first_assistant_snippet for hover preview fallback
   */
  static getAll({ archived = false } = {}) {
    const db = getDb();
    const archivedVal = archived ? 1 : 0;
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
      WHERE COALESCE(s.archived, 0) = ?
      ORDER BY s.last_active_at DESC
    `).all(archivedVal);
  }

  /**
   * Get a session by ID
   */
  static getById(id) {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, sm.orientation_blurb, sm.unresolved_edge, sm.last_pivot, sm.generated_at as metadata_generated_at
      FROM sessions s
      LEFT JOIN session_metadata sm ON s.id = sm.session_id
      WHERE s.id = ?
    `).get(id);

    if (session) {
      // Include context documents summary
      const contexts = ContextService.getBySessionId(id);
      session.documents = contexts.map(c => ({
        id: c.id,
        name: c.source_name,
        type: c.source_type,
        addedAt: c.created_at,
      }));
    }

    return session;
  }

  /**
   * Create a new session using the active model profile
   * Sessions start unassigned (project_id = NULL) — user assigns manually
   * @param {string[]} [contextFromSessions] - Optional array of session IDs to assemble context from
   * @param {string} [continuedFromSessionId] - Optional session ID to create structural link from (no context assembly)
   */
  static create(contextFromSessions = null, continuedFromSessionId = null) {
    const db = getDb();
    const activeProfile = ModelProfileService.getActive();

    if (!activeProfile) {
      throw new Error('No active model profile. Please set one first.');
    }

    const projectId = null;

    const id = generatePrefixedId('ses');
    const timestamp = now();

    db.prepare(`
      INSERT INTO sessions (id, model_profile_id, project_id, user_id, created_at, updated_at, last_active_at)
      VALUES (?, ?, ?, 'default', ?, ?, ?)
    `).run(id, activeProfile.id, projectId, timestamp, timestamp, timestamp);

    // If continuedFromSessionId is provided, create structural link (no context assembly)
    if (continuedFromSessionId) {
      try {
        InquiryLinkService.create(continuedFromSessionId, id);
      } catch (error) {
        // Log but don't fail session creation if link fails
        console.error('Failed to create inquiry link:', error.message);
      }
    }

    // If contextFromSessions is provided, assemble context from those sessions
    if (contextFromSessions && Array.isArray(contextFromSessions) && contextFromSessions.length > 0) {
      const contextParts = [];
      const sessionTitles = [];

      for (const sourceSessionId of contextFromSessions) {
        const sourceSession = this.getById(sourceSessionId);
        if (!sourceSession) continue;

        const messages = MessageService.getBySessionId(sourceSessionId);
        // Get first few exchanges (up to 4 messages: 2 user + 2 assistant)
        const previewMessages = messages
          .filter(m => m.role !== 'system')
          .slice(0, 4);

        if (previewMessages.length === 0) continue;

        const sessionTitle = sourceSession.title || 'Untitled Inquiry';
        sessionTitles.push(sessionTitle);
        const formattedMessages = previewMessages
          .map(m => `${m.role.toUpperCase()}: ${m.content.length > 500 ? m.content.substring(0, 500) + '...' : m.content}`)
          .join('\n\n');

        contextParts.push(`--- From: ${sessionTitle} ---\n${formattedMessages}`);
      }

      if (contextParts.length > 0) {
        const assembledContext = `Context from prior inquiries (for reference, not generated):\n\n${contextParts.join('\n\n')}`;
        ContextService.addAssembledContext(id, assembledContext, sessionTitles);
      }
    }

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
   * - AND NOT imported (imported sessions are "books on a shelf" - no auto-processing)
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
      AND (s.imported IS NULL OR s.imported = 0)
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
   * Update arbitrary session fields (title, pinned, archived)
   * Validates title_locked before allowing title changes
   */
  static updateFields(id, fields) {
    const db = getDb();
    const session = this.getById(id);
    if (!session) throw new Error('Session not found');

    if (fields.title !== undefined && session.title_locked) {
      const err = new Error('Title is locked on imported sessions');
      err.status = 403;
      throw err;
    }

    const allowed = ['title', 'pinned', 'archived'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    updates.push('updated_at = ?');
    values.push(now());
    values.push(id);

    db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.getById(id);
  }

  /**
   * Delete a session and all its messages/metadata/links
   */
  static delete(id) {
    const db = getDb();
    // Clean up inquiry_links referencing this session (both directions)
    db.prepare('DELETE FROM inquiry_links WHERE from_session_id = ? OR to_session_id = ?').run(id, id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return true;
  }

  /**
   * Assign a session to a project
   */
  static setProject(sessionId, projectId) {
    const db = getDb();
    db.prepare('UPDATE sessions SET project_id = ?, updated_at = ? WHERE id = ?')
      .run(projectId, now(), sessionId);
    return this.getById(sessionId);
  }

  /**
   * Get sessions filtered by project
   */
  static getByProject(projectId) {
    const db = getDb();
    const query = projectId
      ? `SELECT s.*, sm.orientation_blurb, sm.unresolved_edge, sm.last_pivot,
           (SELECT SUBSTR(content, 1, 200) FROM messages WHERE session_id = s.id AND role = 'assistant' ORDER BY created_at ASC LIMIT 1) as first_assistant_snippet
         FROM sessions s LEFT JOIN session_metadata sm ON s.id = sm.session_id
         WHERE s.project_id = ? ORDER BY s.last_active_at DESC`
      : `SELECT s.*, sm.orientation_blurb, sm.unresolved_edge, sm.last_pivot,
           (SELECT SUBSTR(content, 1, 200) FROM messages WHERE session_id = s.id AND role = 'assistant' ORDER BY created_at ASC LIMIT 1) as first_assistant_snippet
         FROM sessions s LEFT JOIN session_metadata sm ON s.id = sm.session_id
         WHERE s.project_id IS NULL ORDER BY s.last_active_at DESC`;

    return projectId
      ? db.prepare(query).all(projectId)
      : db.prepare(query).all();
  }

  /**
   * Get sessions that have documents attached
   */
  static getWithDocuments() {
    const db = getDb();
    return db.prepare(`
      SELECT DISTINCT s.*, sm.orientation_blurb, sm.unresolved_edge, sm.last_pivot,
        (SELECT SUBSTR(content, 1, 200) FROM messages WHERE session_id = s.id AND role = 'assistant' ORDER BY created_at ASC LIMIT 1) as first_assistant_snippet
      FROM sessions s
      LEFT JOIN session_metadata sm ON s.id = sm.session_id
      INNER JOIN session_context sc ON s.id = sc.session_id
      ORDER BY s.last_active_at DESC
    `).all();
  }
}
