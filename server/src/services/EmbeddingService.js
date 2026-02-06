import OpenAI from 'openai';
import { OllamaProvider } from '../providers/OllamaProvider.js';
import { OLLAMA_CONFIG } from '../config/constants.js';

// OpenAI embedding config
const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_DIMENSIONS = 1536;

// Ollama embedding config (nomic-embed-text produces 768-dim vectors)
const OLLAMA_DIMENSIONS = 768;

let openaiClient = null;
let ollamaProvider = null;

/**
 * Check if local embeddings should be used
 */
function useLocalEmbeddings() {
  return process.env.USE_LOCAL_EMBEDDINGS === 'true';
}

/**
 * Lazy initialization of OpenAI client
 */
function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Lazy initialization of Ollama provider
 */
function getOllamaProvider() {
  if (!ollamaProvider) {
    ollamaProvider = new OllamaProvider();
  }
  return ollamaProvider;
}

export class EmbeddingService {
  /**
   * Generate embedding for text
   * Uses Ollama if USE_LOCAL_EMBEDDINGS=true, otherwise OpenAI
   * @param {string} text - Text to embed
   * @returns {Promise<{vector: number[], dim: number, model: string}|null>} Embedding or null on failure
   */
  static async embed(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('[EmbeddingService] Invalid text input');
      return null;
    }

    if (useLocalEmbeddings()) {
      return EmbeddingService.embedWithOllama(text);
    }

    return EmbeddingService.embedWithOpenAI(text);
  }

  /**
   * Generate embedding using OpenAI
   */
  static async embedWithOpenAI(text) {
    const openai = getOpenAIClient();
    if (!openai) {
      console.error('[EmbeddingService] OpenAI API key not configured');
      // Fallback to local if available
      const ollama = getOllamaProvider();
      if (await ollama.isAvailable()) {
        console.log('[EmbeddingService] Falling back to Ollama embeddings');
        return EmbeddingService.embedWithOllama(text);
      }
      return null;
    }

    try {
      const response = await openai.embeddings.create({
        model: OPENAI_MODEL,
        input: text.trim(),
      });

      const vector = response.data[0].embedding;

      return {
        vector,
        dim: OPENAI_DIMENSIONS,
        model: OPENAI_MODEL,
      };
    } catch (error) {
      console.error('[EmbeddingService] OpenAI embedding failed:', error.message);
      return null;
    }
  }

  /**
   * Generate embedding using Ollama (local)
   */
  static async embedWithOllama(text) {
    const ollama = getOllamaProvider();

    try {
      // Check if Ollama is available
      if (!(await ollama.isAvailable())) {
        console.error('[EmbeddingService] Ollama not available');
        return null;
      }

      const model = process.env.OLLAMA_EMBEDDING_MODEL || OLLAMA_CONFIG.embeddingModel;
      const vector = await ollama.generateEmbedding(text.trim(), model);

      return {
        vector,
        dim: vector.length,
        model: model,
      };
    } catch (error) {
      console.error('[EmbeddingService] Ollama embedding failed:', error.message);
      return null;
    }
  }

  /**
   * Check if embedding service is available
   */
  static async isAvailable() {
    if (useLocalEmbeddings()) {
      const ollama = getOllamaProvider();
      return ollama.isAvailable();
    }

    const openai = getOpenAIClient();
    if (openai) return true;

    // Check Ollama as fallback
    const ollama = getOllamaProvider();
    return ollama.isAvailable();
  }

  /**
   * Get the current embedding provider info
   */
  static async getProviderInfo() {
    if (useLocalEmbeddings()) {
      const ollama = getOllamaProvider();
      const available = await ollama.isAvailable();
      return {
        provider: 'ollama',
        model: process.env.OLLAMA_EMBEDDING_MODEL || OLLAMA_CONFIG.embeddingModel,
        dimensions: OLLAMA_DIMENSIONS,
        available,
      };
    }

    const openai = getOpenAIClient();
    if (openai) {
      return {
        provider: 'openai',
        model: OPENAI_MODEL,
        dimensions: OPENAI_DIMENSIONS,
        available: true,
      };
    }

    // Check Ollama as fallback
    const ollama = getOllamaProvider();
    const available = await ollama.isAvailable();
    return {
      provider: available ? 'ollama (fallback)' : 'none',
      model: available ? OLLAMA_CONFIG.embeddingModel : null,
      dimensions: available ? OLLAMA_DIMENSIONS : null,
      available,
    };
  }
}
