import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class EmbeddingStore {
  /**
   * Check if embedding exists for a source
   * @param {string} sourceType - 'session_summary' or 'document_chunk'
   * @param {string} sourceId - ID of the source entity
   * @returns {boolean}
   */
  static exists(sourceType, sourceId) {
    const db = getDb();
    const result = db.prepare(
      'SELECT 1 FROM embeddings WHERE source_type = ? AND source_id = ?'
    ).get(sourceType, sourceId);
    return !!result;
  }

  /**
   * Store or replace an embedding
   * @param {string} sourceType - 'session_summary' or 'document_chunk'
   * @param {string} sourceId - ID of the source entity
   * @param {{vector: number[], dim: number, model: string}} embedding - Embedding data
   * @returns {object|null} Stored embedding record
   */
  static store(sourceType, sourceId, embedding) {
    if (!embedding || !embedding.vector || !embedding.dim || !embedding.model) {
      console.error('[EmbeddingStore] Invalid embedding data');
      return null;
    }

    const db = getDb();
    const vectorJson = JSON.stringify(embedding.vector);
    const timestamp = now();

    // Use INSERT OR REPLACE for upsert behavior
    const id = generatePrefixedId('emb');

    try {
      // Delete existing if present (to handle the UNIQUE constraint properly)
      db.prepare(
        'DELETE FROM embeddings WHERE source_type = ? AND source_id = ?'
      ).run(sourceType, sourceId);

      db.prepare(`
        INSERT INTO embeddings (id, source_type, source_id, vector, dim, model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, sourceType, sourceId, vectorJson, embedding.dim, embedding.model, timestamp);

      return this.getBySource(sourceType, sourceId);
    } catch (error) {
      console.error('[EmbeddingStore] Store failed:', error.message);
      return null;
    }
  }

  /**
   * Get embedding by source
   * @param {string} sourceType - 'session_summary' or 'document_chunk'
   * @param {string} sourceId - ID of the source entity
   * @returns {object|null} Embedding record with parsed vector
   */
  static getBySource(sourceType, sourceId) {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM embeddings WHERE source_type = ? AND source_id = ?'
    ).get(sourceType, sourceId);

    if (!row) return null;

    return {
      ...row,
      vector: JSON.parse(row.vector),
    };
  }

  /**
   * Get all embeddings of a specific type
   * @param {string} sourceType - 'session_summary' or 'document_chunk'
   * @returns {object[]} Array of embedding records with parsed vectors
   */
  static getAllByType(sourceType) {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM embeddings WHERE source_type = ?'
    ).all(sourceType);

    return rows.map(row => ({
      ...row,
      vector: JSON.parse(row.vector),
    }));
  }
}
