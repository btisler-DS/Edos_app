/**
 * Base class for LLM providers
 * Defines the interface that all providers must implement
 */
export class LLMProvider {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error(`API key required for ${this.constructor.name}`);
    }
    this.apiKey = apiKey;
  }

  /**
   * Send a message and get a streaming response
   * @param {Array} messages - Array of {role, content} objects
   * @param {Object} modelProfile - The model profile with model_id, system_prompt, parameters
   * @returns {AsyncGenerator} - Yields text chunks
   */
  async *sendMessageStream(messages, modelProfile) {
    throw new Error('sendMessageStream not implemented');
  }

  /**
   * Generate re-entry metadata for a session using utility model
   * @param {string} sessionContent - Compressed session content
   * @returns {Object} - { orientation_blurb, unresolved_edge, last_pivot }
   */
  async generateMetadata(sessionContent) {
    throw new Error('generateMetadata not implemented');
  }

  /**
   * Generate a title for a session using utility model
   * @param {string} sessionContent - First exchange content
   * @returns {string} - Generated title
   */
  async generateTitle(sessionContent) {
    throw new Error('generateTitle not implemented');
  }

  /**
   * Get the utility model ID for this provider
   */
  static get UTILITY_MODEL() {
    throw new Error('UTILITY_MODEL not defined');
  }
}
