import { getDb } from '../db/connection.js';
import { EmbeddingService } from './EmbeddingService.js';
import { EmbeddingStore } from './EmbeddingStore.js';
import { cosineSimilarity } from '../utils/similarity.js';

export class SearchService {
  /**
   * Build optional project filter clause
   * @param {string|null} projectId
   * @returns {{ clause: string, params: any[] }}
   */
  static _projectFilter(alias, projectId) {
    if (!projectId) return { clause: '', params: [] };
    if (projectId === 'unassigned') {
      return { clause: ` AND ${alias}.project_id IS NULL`, params: [] };
    }
    return { clause: ` AND ${alias}.project_id = ?`, params: [projectId] };
  }

  /**
   * Keyword search across sessions and messages
   */
  static searchKeyword(query, options = {}) {
    const {
      limit = 25,
      includeAssistant = false,
      importedOnly = false,
      projectId = null,
    } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    const db = getDb();
    const searchTerm = `%${query.trim()}%`;
    const results = [];
    const seenSessions = new Set();

    // Build project filter for sessions (no alias) and joined queries (alias 's')
    const projSes = this._projectFilter('sessions', projectId);
    const projS = this._projectFilter('s', projectId);

    // Search session titles first
    let titleSql = `SELECT id, title, created_at, last_active_at, project_id, COALESCE(imported, 0) as imported
      FROM sessions WHERE title LIKE ?`;
    const titleParams = [searchTerm];
    if (importedOnly) titleSql += ` AND imported = 1`;
    titleSql += projSes.clause;
    titleParams.push(...projSes.params);
    titleSql += ` ORDER BY last_active_at DESC LIMIT ?`;
    titleParams.push(limit);

    const titleMatches = db.prepare(titleSql).all(...titleParams);

    for (const session of titleMatches) {
      if (!seenSessions.has(session.id)) {
        seenSessions.add(session.id);
        results.push({
          sessionId: session.id,
          title: session.title || 'Untitled Inquiry',
          timestamp: session.last_active_at || session.created_at,
          snippet: session.title,
          source: 'title',
          badge: session.imported ? 'Imported' : 'Native',
          projectId: session.project_id,
        });
      }
    }

    // Search user messages
    let userSql = `SELECT m.session_id, m.content, m.created_at, s.title, s.last_active_at, s.project_id, COALESCE(s.imported, 0) as imported
      FROM messages m JOIN sessions s ON m.session_id = s.id
      WHERE m.role = 'user' AND m.content LIKE ?`;
    const userParams = [searchTerm];
    if (importedOnly) userSql += ` AND s.imported = 1`;
    userSql += projS.clause;
    userParams.push(...projS.params);
    userSql += ` ORDER BY m.created_at DESC LIMIT ?`;
    userParams.push(limit);

    const userMsgMatches = db.prepare(userSql).all(...userParams);

    for (const match of userMsgMatches) {
      if (!seenSessions.has(match.session_id)) {
        seenSessions.add(match.session_id);
        results.push({
          sessionId: match.session_id,
          title: match.title || 'Untitled Inquiry',
          timestamp: match.last_active_at || match.created_at,
          snippet: this.extractSnippet(match.content, query),
          source: 'user_message',
          badge: match.imported ? 'Imported' : 'Native',
          projectId: match.project_id,
        });
      }
    }

    // Search assistant messages if requested
    if (includeAssistant) {
      let asstSql = `SELECT m.session_id, m.content, m.created_at, s.title, s.last_active_at, s.project_id, COALESCE(s.imported, 0) as imported
        FROM messages m JOIN sessions s ON m.session_id = s.id
        WHERE m.role = 'assistant' AND m.content LIKE ?`;
      const asstParams = [searchTerm];
      if (importedOnly) asstSql += ` AND s.imported = 1`;
      asstSql += projS.clause;
      asstParams.push(...projS.params);
      asstSql += ` ORDER BY m.created_at DESC LIMIT ?`;
      asstParams.push(limit);

      const assistantMsgMatches = db.prepare(asstSql).all(...asstParams);

      for (const match of assistantMsgMatches) {
        if (!seenSessions.has(match.session_id)) {
          seenSessions.add(match.session_id);
          results.push({
            sessionId: match.session_id,
            title: match.title || 'Untitled Inquiry',
            timestamp: match.last_active_at || match.created_at,
            snippet: this.extractSnippet(match.content, query),
            source: 'assistant_message',
            badge: match.imported ? 'Imported' : 'Native',
            projectId: match.project_id,
          });
        }
      }
    }

    // Sort by recency and limit
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return results.slice(0, limit);
  }

  /**
   * Search sessions by date range
   */
  static searchByDate(options = {}) {
    const {
      startDate,
      endDate,
      importedOnly = false,
      projectId = null,
      limit = 25,
    } = options;

    const db = getDb();
    let query = `SELECT id, title, created_at, last_active_at, project_id, COALESCE(imported, 0) as imported FROM sessions WHERE 1=1`;
    const params = [];

    if (startDate) {
      query += ` AND (created_at >= ? OR last_active_at >= ?)`;
      params.push(startDate, startDate);
    }

    if (endDate) {
      query += ` AND (created_at <= ? OR last_active_at <= ?)`;
      params.push(endDate, endDate);
    }

    if (importedOnly) {
      query += ` AND imported = 1`;
    }

    const projFilter = this._projectFilter('sessions', projectId);
    query += projFilter.clause;
    params.push(...projFilter.params);

    query += ` ORDER BY last_active_at DESC LIMIT ?`;
    params.push(limit);

    const sessions = db.prepare(query).all(...params);

    return sessions.map(session => ({
      sessionId: session.id,
      title: session.title || 'Untitled Inquiry',
      timestamp: session.last_active_at || session.created_at,
      createdAt: session.created_at,
      badge: session.imported ? 'Imported' : 'Native',
      projectId: session.project_id,
    }));
  }

  /**
   * Concept search using semantic similarity
   */
  static async searchConcept(query, options = {}) {
    const { limit = 25, projectId = null } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    // Generate embedding for query
    const queryEmbedding = await EmbeddingService.embed(query.trim());
    if (!queryEmbedding) {
      console.error('[SearchService] Failed to generate query embedding');
      return [];
    }

    // Get all session embeddings
    const allEmbeddings = EmbeddingStore.getAllByType('session_summary');
    if (allEmbeddings.length === 0) {
      return [];
    }

    const db = getDb();

    // Calculate similarities
    const similarities = [];
    for (const embedding of allEmbeddings) {
      const score = cosineSimilarity(queryEmbedding.vector, embedding.vector);
      similarities.push({
        sessionId: embedding.source_id,
        score,
      });
    }

    // Sort by score descending
    similarities.sort((a, b) => b.score - a.score);

    // Enrich with session data, applying project filter post-hoc
    const enriched = [];
    for (const result of similarities) {
      if (enriched.length >= limit) break;

      const session = db.prepare(
        'SELECT id, title, created_at, last_active_at, project_id, COALESCE(imported, 0) as imported FROM sessions WHERE id = ?'
      ).get(result.sessionId);

      if (!session || !session.title) continue;

      // Apply project filter
      if (projectId) {
        if (projectId === 'unassigned' && session.project_id !== null) continue;
        if (projectId !== 'unassigned' && session.project_id !== projectId) continue;
      }

      enriched.push({
        sessionId: result.sessionId,
        title: session.title || 'Untitled Inquiry',
        timestamp: session.last_active_at || session.created_at,
        score: Math.round(result.score * 100) / 100,
        badge: session.imported ? 'Imported' : 'Native',
        projectId: session.project_id,
      });
    }

    return enriched;
  }

  /**
   * Extract a snippet around the search term (~240 chars)
   */
  static extractSnippet(content, query, contextLength = 120) {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      return content.slice(0, contextLength * 2) + '...';
    }

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + query.length + contextLength);

    let snippet = content.slice(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }
}
