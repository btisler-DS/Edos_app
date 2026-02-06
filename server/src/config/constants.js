// EDOS Configuration Constants

// Inactivity threshold for metadata regeneration (60 minutes)
export const INACTIVITY_THRESHOLD_MS = 60 * 60 * 1000;

// Background job interval (5 minutes)
export const METADATA_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

// Context limits (approximate token counts)
export const CONTEXT_LIMITS = {
  anthropic: {
    'claude-sonnet-4-20250514': 200000,
    'claude-haiku-3-5-20241022': 200000,
  },
  openai: {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
  },
  ollama: {
    // Context varies by model, these are typical defaults
    'llama3.2:latest': 8192,
    'mistral:latest': 8192,
    'phi3:latest': 4096,
    'qwen2.5:7b': 32768,
  },
};

// Utility models for metadata generation (hardcoded per provider)
export const UTILITY_MODELS = {
  anthropic: 'claude-3-5-haiku-20241022',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2:latest', // Fast local model for utility tasks
};

// Ollama Configuration
export const OLLAMA_CONFIG = {
  defaultUrl: 'http://localhost:11434',
  utilityModel: 'llama3.2:latest',
  embeddingModel: 'nomic-embed-text',
  // Recommended models for RTX 3060 (12GB VRAM):
  // - llama3.2:latest (8B) - ~30 tokens/sec
  // - mistral:latest (7B) - ~30 tokens/sec
  // - phi3:latest (3.8B) - ~50 tokens/sec
  // - qwen2.5:7b - ~25 tokens/sec
};

// Default parameters for new model profiles
export const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  max_tokens: 4096,
};

// Message truncation settings
export const MAX_CONTEXT_MESSAGES = 100; // Will be refined based on actual token counting

// Web Search Configuration
export const WEB_SEARCH = {
  enabled: false, // Override via WEB_SEARCH_ENABLED env var
  defaultProvider: 'bing',
  maxResults: 5,
  cacheTtlMs: 15 * 60 * 1000, // 15 minutes
};
