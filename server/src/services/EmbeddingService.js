import OpenAI from 'openai';

const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

let client = null;

/**
 * Lazy initialization of OpenAI client
 */
function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export class EmbeddingService {
  /**
   * Generate embedding for text
   * @param {string} text - Text to embed
   * @returns {Promise<{vector: number[], dim: number, model: string}|null>} Embedding or null on failure
   */
  static async embed(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('[EmbeddingService] Invalid text input');
      return null;
    }

    const openai = getClient();
    if (!openai) {
      console.error('[EmbeddingService] OpenAI API key not configured');
      return null;
    }

    try {
      const response = await openai.embeddings.create({
        model: MODEL,
        input: text.trim(),
      });

      const vector = response.data[0].embedding;

      return {
        vector,
        dim: DIMENSIONS,
        model: MODEL,
      };
    } catch (error) {
      console.error('[EmbeddingService] Embedding failed:', error.message);
      return null;
    }
  }
}
