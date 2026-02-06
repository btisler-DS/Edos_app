import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { OllamaProvider } from './OllamaProvider.js';

/**
 * Factory function to get the appropriate provider
 * @param {string} providerName - 'anthropic', 'openai', or 'ollama'
 * @param {string} apiKey - The API key for the provider (not needed for ollama)
 * @returns {LLMProvider}
 */
export function getProvider(providerName, apiKey) {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'ollama':
      return new OllamaProvider();
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Get provider based on environment variables
 * @param {string} providerName - 'anthropic', 'openai', or 'ollama'
 * @returns {LLMProvider}
 */
export function getProviderFromEnv(providerName) {
  // Ollama doesn't need an API key
  if (providerName === 'ollama') {
    return new OllamaProvider();
  }

  const keyMap = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };

  const apiKey = keyMap[providerName];
  if (!apiKey) {
    throw new Error(`No API key found for provider: ${providerName}. Check your .env file.`);
  }

  return getProvider(providerName, apiKey);
}

/**
 * Check if Ollama is available
 */
export async function isOllamaAvailable() {
  const provider = new OllamaProvider();
  return provider.isAvailable();
}

/**
 * List available Ollama models
 */
export async function listOllamaModels() {
  const provider = new OllamaProvider();
  return provider.listModels();
}

export { AnthropicProvider, OpenAIProvider, OllamaProvider };
