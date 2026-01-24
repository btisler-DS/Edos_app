import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';
import { MessageService } from './MessageService.js';
import { SessionService } from './SessionService.js';
import { getProviderFromEnv } from '../providers/index.js';
import { EmbeddingService } from './EmbeddingService.js';
import { EmbeddingStore } from './EmbeddingStore.js';

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
    const result = this._upsertMetadata(sessionId, metadata);

    // Fire-and-forget embedding generation
    this._embedSessionSummary(sessionId, metadata).catch(err => {
      console.error(`[MetadataService] Embedding failed:`, err.message);
    });

    return result;
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

  /**
   * Generate and store embedding for session summary (private)
   * @param {string} sessionId - Session ID
   * @param {object} metadata - Generated metadata
   */
  static async _embedSessionSummary(sessionId, metadata) {
    // Check if already embedded
    if (EmbeddingStore.exists('session_summary', sessionId)) {
      return;
    }

    // Combine metadata fields into text for embedding
    const textParts = [];
    if (metadata.orientation_blurb) {
      textParts.push(metadata.orientation_blurb);
    }
    if (metadata.unresolved_edge) {
      textParts.push(metadata.unresolved_edge);
    }
    if (metadata.last_pivot) {
      textParts.push(metadata.last_pivot);
    }

    const text = textParts.join(' ');
    if (!text.trim()) {
      return;
    }

    // Generate embedding
    const embedding = await EmbeddingService.embed(text);
    if (!embedding) {
      return;
    }

    // Store embedding
    EmbeddingStore.store('session_summary', sessionId, embedding);
    console.log(`[MetadataService] Embedded session summary for ${sessionId}`);
  }
}
