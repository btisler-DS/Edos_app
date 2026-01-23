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
};

// Utility models for metadata generation (hardcoded per provider)
export const UTILITY_MODELS = {
  anthropic: 'claude-3-5-haiku-20241022',
  openai: 'gpt-4o-mini',
};

// Default parameters for new model profiles
export const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  max_tokens: 4096,
};

// Message truncation settings
export const MAX_CONTEXT_MESSAGES = 100; // Will be refined based on actual token counting
