import { getDb } from '../db/connection.js';
import { EmbeddingStore } from './EmbeddingStore.js';
import { EmbeddingService } from './EmbeddingService.js';
import { cosineSimilarity } from '../utils/similarity.js';
import { formatRelativeTime } from '../utils/time.js';

export class SimilarityService {
  /**
   * Search for similar sessions by query text
   * @param {string} query - Search query
   * @param {string} excludeSessionId - Session ID to exclude (current session)
   * @param {number} limit - Maximum results to return
   * @param {number} threshold - Minimum similarity score (0-1)
   * @returns {Promise<object[]>} Array of similar sessions with metadata
   */
  static async searchByQuery(query, excludeSessionId = null, limit = 5, threshold = 0.3) {
    try {
      if (!query || query.trim().length < 10) {
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await EmbeddingService.embed(query.trim());
      if (!queryEmbedding) {
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
        // Skip excluded session
        if (embedding.source_id === excludeSessionId) {
          continue;
        }

        const score = cosineSimilarity(queryEmbedding.vector, embedding.vector);

        // Only include if above threshold
        if (score >= threshold) {
          similarities.push({
            sessionId: embedding.source_id,
            score,
          });
        }
      }

      // Sort by score descending and take top N
      similarities.sort((a, b) => b.score - a.score);
      const topResults = similarities.slice(0, limit);

      // Enrich with session data and metadata
      return topResults.map(result => {
        const session = db.prepare(
          'SELECT id, title, created_at, last_active_at FROM sessions WHERE id = ?'
        ).get(result.sessionId);

        const metadata = db.prepare(
          'SELECT orientation_blurb, unresolved_edge FROM session_metadata WHERE session_id = ?'
        ).get(result.sessionId);

        if (!session) return null;

        // Calculate relative time
        const timestamp = session.last_active_at || session.created_at;
        const relativeTime = formatRelativeTime(timestamp);

        return {
          id: result.sessionId,
          type: 'session',
          score: Math.round(result.score * 100) / 100,
          title: session.title || 'Untitled',
          timestamp,
          relativeTime,
          preview: metadata?.orientation_blurb || null,
          hasUnresolved: !!metadata?.unresolved_edge,
        };
      }).filter(Boolean);
    } catch (error) {
      console.error('[SimilarityService] searchByQuery failed:', error.message);
      return [];
    }
  }

  /**
   * Find sessions similar to the given session
   * @param {string} sessionId - Source session ID
   * @param {number} limit - Maximum results to return
   * @returns {object[]} Array of similar sessions with scores
   */
  static findSimilarSessions(sessionId, limit = 5) {
    try {
      // Get source session's embedding
      const sourceEmbedding = EmbeddingStore.getBySource('session_summary', sessionId);
      if (!sourceEmbedding) {
        return [];
      }

      // Get all session embeddings
      const allEmbeddings = EmbeddingStore.getAllByType('session_summary');
      if (allEmbeddings.length === 0) {
        return [];
      }

      // Calculate similarities
      const similarities = [];
      for (const embedding of allEmbeddings) {
        // Skip self
        if (embedding.source_id === sessionId) {
          continue;
        }

        const score = cosineSimilarity(sourceEmbedding.vector, embedding.vector);
        similarities.push({
          sessionId: embedding.source_id,
          score,
        });
      }

      // Sort by score descending and take top N
      similarities.sort((a, b) => b.score - a.score);
      const topResults = similarities.slice(0, limit);

      // Enrich with session data
      const db = getDb();
      return topResults.map(result => {
        const session = db.prepare(
          'SELECT id, title, created_at, last_active_at FROM sessions WHERE id = ?'
        ).get(result.sessionId);

        return {
          id: result.sessionId,
          type: 'session',
          score: Math.round(result.score * 100) / 100,
          title: session?.title || 'Untitled',
          timestamp: session?.last_active_at || session?.created_at,
        };
      }).filter(r => r.title); // Filter out sessions that no longer exist
    } catch (error) {
      console.error('[SimilarityService] findSimilarSessions failed:', error.message);
      return [];
    }
  }

  /**
   * Find documents similar to the given session
   * @param {string} sessionId - Source session ID
   * @param {number} limit - Maximum results to return
   * @returns {object[]} Array of similar documents with scores
   */
  static findSimilarDocuments(sessionId, limit = 5) {
    try {
      // Get source session's embedding
      const sourceEmbedding = EmbeddingStore.getBySource('session_summary', sessionId);
      if (!sourceEmbedding) {
        return [];
      }

      // Get all document chunk embeddings
      const allEmbeddings = EmbeddingStore.getAllByType('document_chunk');
      if (allEmbeddings.length === 0) {
        return [];
      }

      const db = getDb();

      // Calculate similarities and get context_id via join
      const similarities = [];
      for (const embedding of allEmbeddings) {
        const score = cosineSimilarity(sourceEmbedding.vector, embedding.vector);

        // Get chunk info to find context_id
        const chunk = db.prepare(
          'SELECT id, context_id, source_name, created_at FROM document_chunks WHERE id = ?'
        ).get(embedding.source_id);

        if (chunk) {
          similarities.push({
            chunkId: embedding.source_id,
            contextId: chunk.context_id,
            sourceName: chunk.source_name,
            createdAt: chunk.created_at,
            score,
          });
        }
      }

      // Sort by score descending
      similarities.sort((a, b) => b.score - a.score);

      // Deduplicate by context_id (keep best chunk per document)
      const seenContexts = new Set();
      const deduped = [];

      for (const result of similarities) {
        if (!seenContexts.has(result.contextId)) {
          seenContexts.add(result.contextId);
          deduped.push(result);
        }

        if (deduped.length >= limit) {
          break;
        }
      }

      // Format results
      return deduped.map(result => ({
        id: result.contextId,
        type: 'document',
        score: Math.round(result.score * 100) / 100,
        title: result.sourceName,
        timestamp: result.createdAt,
      }));
    } catch (error) {
      console.error('[SimilarityService] findSimilarDocuments failed:', error.message);
      return [];
    }
  }
}
