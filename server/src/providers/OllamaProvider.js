/**
 * Ollama Provider for local LLM inference
 *
 * Uses Ollama's HTTP API for chat completions and embeddings.
 * Default URL: http://localhost:11434
 *
 * Recommended models for RTX 3060 (12GB VRAM):
 * - llama3.2:latest (8B) - Fast, good quality
 * - mistral:latest (7B) - Fast, good for code
 * - phi3:latest (3.8B) - Very fast, smaller context
 * - qwen2.5:7b - Good multilingual support
 */

import { LLMProvider } from './LLMProvider.js';
import { OLLAMA_CONFIG } from '../config/constants.js';

const METADATA_PROMPT = `Analyze this conversation and provide exactly three pieces of information in JSON format:

1. "orientation_blurb": A 2-3 sentence summary of what this inquiry is about. Write it as if reminding someone who was deeply engaged but stepped away.

2. "unresolved_edge": What question or tension remains open? What wasn't fully resolved or concluded? If the conversation feels complete, say "None apparent."

3. "last_pivot": Where did the conversation's direction or focus last change significantly? Describe the shift briefly.

Respond ONLY with valid JSON in this exact format:
{"orientation_blurb": "...", "unresolved_edge": "...", "last_pivot": "..."}`;

const TITLE_PROMPT = `Based on this conversation opening, generate a concise, descriptive title (3-7 words) that captures the essence of the inquiry. The title should help someone recognize what this conversation was about when they see it in a list.

Respond with ONLY the title text, no quotes or punctuation unless part of the title.`;

export class OllamaProvider extends LLMProvider {
  constructor(baseUrl = null) {
    // Ollama doesn't need an API key, pass a placeholder
    super('ollama-local');
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || OLLAMA_CONFIG.defaultUrl;
  }

  static get UTILITY_MODEL() {
    return process.env.OLLAMA_UTILITY_MODEL || OLLAMA_CONFIG.utilityModel;
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to list models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async *sendMessageStream(messages, modelProfile) {
    const params = JSON.parse(modelProfile.parameters || '{}');

    // Build the request body for Ollama chat API
    const body = {
      model: modelProfile.model_id,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      options: {
        temperature: params.temperature ?? 0.7,
        num_predict: params.max_tokens ?? 4096,
      },
    };

    // Add system prompt if provided
    if (modelProfile.system_prompt) {
      body.messages = [
        { role: 'system', content: modelProfile.system_prompt },
        ...body.messages,
      ];
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }

    // Parse streaming NDJSON response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateMetadata(sessionContent) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OllamaProvider.UTILITY_MODEL,
          messages: [
            {
              role: 'user',
              content: `${METADATA_PROMPT}\n\nConversation:\n${sessionContent}`,
            },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${await response.text()}`);
      }

      const data = await response.json();
      const text = data.message?.content || '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('No valid JSON in response');
    } catch (error) {
      console.error('Metadata generation failed:', error);
      return {
        orientation_blurb: 'Unable to generate summary',
        unresolved_edge: 'Unknown',
        last_pivot: 'Unknown',
      };
    }
  }

  async generateTitle(sessionContent) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OllamaProvider.UTILITY_MODEL,
          messages: [
            {
              role: 'user',
              content: `${TITLE_PROMPT}\n\nConversation:\n${sessionContent}`,
            },
          ],
          stream: false,
          options: {
            temperature: 0.5,
            num_predict: 50,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${await response.text()}`);
      }

      const data = await response.json();
      return (data.message?.content || '').trim();
    } catch (error) {
      console.error('Title generation failed:', error);
      return null;
    }
  }

  async generateSynthesis(prompt, modelId = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelId || OllamaProvider.UTILITY_MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${await response.text()}`);
      }

      const data = await response.json();
      return (data.message?.content || '').trim();
    } catch (error) {
      console.error('Synthesis generation failed:', error);
      throw new Error('Failed to generate synthesis: ' + error.message);
    }
  }

  /**
   * Generate embeddings using Ollama
   * @param {string} text - Text to embed
   * @param {string} model - Embedding model (default: nomic-embed-text)
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text, model = null) {
    const embeddingModel = model || process.env.OLLAMA_EMBEDDING_MODEL || OLLAMA_CONFIG.embeddingModel;

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: embeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding;
  }
}

export default OllamaProvider;
