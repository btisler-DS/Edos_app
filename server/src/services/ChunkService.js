import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class ChunkService {
  /**
   * Store chunks for a document
   * @param {string} contextId - ID of the session_context record
   * @param {string} sourceName - Original filename
   * @param {Array<{text: string, index: number}>} chunks - Chunks from chunkText()
   * @returns {object[]} Array of stored chunk records
   */
  static storeChunks(contextId, sourceName, chunks) {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    const db = getDb();
    const timestamp = now();
    const storedChunks = [];

    const insertStmt = db.prepare(`
      INSERT INTO document_chunks (id, context_id, chunk_index, source_name, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const chunk of chunks) {
      const id = generatePrefixedId('chunk');

      try {
        insertStmt.run(id, contextId, chunk.index, sourceName, chunk.text, timestamp);
        storedChunks.push(this.getById(id));
      } catch (error) {
        console.error(`[ChunkService] Failed to store chunk ${chunk.index}:`, error.message);
      }
    }

    return storedChunks;
  }

  /**
   * Get all chunks for a context (document)
   * @param {string} contextId - ID of the session_context record
   * @returns {object[]} Array of chunk records
   */
  static getByContextId(contextId) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM document_chunks
      WHERE context_id = ?
      ORDER BY chunk_index ASC
    `).all(contextId);
  }

  /**
   * Get a single chunk by ID
   * @param {string} chunkId - Chunk ID
   * @returns {object|null} Chunk record with full metadata
   */
  static getById(chunkId) {
    const db = getDb();
    return db.prepare('SELECT * FROM document_chunks WHERE id = ?').get(chunkId);
  }
}
