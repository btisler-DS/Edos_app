import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

/**
 * Factory function to get the appropriate provider
 * @param {string} providerName - 'anthropic' or 'openai'
 * @param {string} apiKey - The API key for the provider
 * @returns {LLMProvider}
 */
export function getProvider(providerName, apiKey) {
  switch (providerName) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

/**
 * Get provider based on environment variables
 * @param {string} providerName - 'anthropic' or 'openai'
 * @returns {LLMProvider}
 */
export function getProviderFromEnv(providerName) {
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

export { AnthropicProvider, OpenAIProvider };
