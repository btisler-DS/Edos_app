import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';
import { MessageService } from './MessageService.js';
import { SessionService } from './SessionService.js';
import { getProviderFromEnv } from '../providers/index.js';

export class MetadataService {
  /**
   * Get metadata for a session
   */
  static getBySessionId(sessionId) {
    const db = getDb();
    return db.prepare('SELECT * FROM session_metadata WHERE session_id = ?').get(sessionId);
  }

  /**
   * Generate and store metadata for a session
   */
  static async generateForSession(sessionId) {
    const session = SessionService.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const modelProfile = SessionService.getModelProfile(sessionId);
    if (!modelProfile) {
      throw new Error(`Model profile not found for session: ${sessionId}`);
    }

    // Get session content
    const content = MessageService.getSessionContentForMetadata(sessionId);
    if (!content) {
      console.log(`No content for session ${sessionId}, skipping metadata generation`);
      return null;
    }

    // Get provider and generate metadata
    const provider = getProviderFromEnv(modelProfile.provider);
    const metadata = await provider.generateMetadata(content);

    // Store the metadata
    return this._upsertMetadata(sessionId, metadata);
  }

  /**
   * Generate title for a session (called after first assistant response)
   */
  static async generateTitleForSession(sessionId) {
    const session = SessionService.getById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Don't regenerate if title already exists
    if (session.title) {
      return session.title;
    }

    const modelProfile = SessionService.getModelProfile(sessionId);
    if (!modelProfile) {
      throw new Error(`Model profile not found for session: ${sessionId}`);
    }

    // Get first exchange
    const firstExchange = MessageService.getFirstExchange(sessionId);
    if (firstExchange.length < 2) {
      return null; // Need at least user + assistant message
    }

    const content = firstExchange
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    // Get provider and generate title
    const provider = getProviderFromEnv(modelProfile.provider);
    const title = await provider.generateTitle(content);

    if (title) {
      SessionService.setTitle(sessionId, title);
      return title;
    }

    // Fallback title
    const fallback = `Untitled Inquiry — ${new Date().toISOString().split('T')[0]}`;
    SessionService.setTitle(sessionId, fallback);
    return fallback;
  }

  /**
   * Insert or update metadata for a session
   */
  static _upsertMetadata(sessionId, metadata) {
    const db = getDb();
    const existing = this.getBySessionId(sessionId);
    const timestamp = now();

    if (existing) {
      db.prepare(`
        UPDATE session_metadata
        SET orientation_blurb = ?, unresolved_edge = ?, last_pivot = ?, generated_at = ?
        WHERE session_id = ?
      `).run(
        metadata.orientation_blurb,
        metadata.unresolved_edge,
        metadata.last_pivot,
        timestamp,
        sessionId
      );
    } else {
      const id = generatePrefixedId('meta');
      db.prepare(`
        INSERT INTO session_metadata (id, session_id, orientation_blurb, unresolved_edge, last_pivot, generated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        sessionId,
        metadata.orientation_blurb,
        metadata.unresolved_edge,
        metadata.last_pivot,
        timestamp
      );
    }

    return this.getBySessionId(sessionId);
  }
}
