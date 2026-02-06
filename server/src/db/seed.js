import { getDb } from './connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { OLLAMA_CONFIG } from '../config/constants.js';

/**
 * Seed the database with default data
 */
export function seedDatabase() {
  const db = getDb();

  const edosSystemPrompt = 'You are Edos, a persistent inquiry environment designed for deep thinking and re-entry. Engage thoughtfully with questions. Preserve context across exchanges. Help the user build understanding over time.';

  // Check if default Anthropic profile already exists
  const existingAnthropic = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get('default-anthropic');

  if (!existingAnthropic) {
    const stmt = db.prepare(`
      INSERT INTO model_profiles (id, name, provider, model_id, system_prompt, parameters, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      'default-anthropic',
      'EDOS Default (Claude)',
      'anthropic',
      'claude-sonnet-4-20250514',
      edosSystemPrompt,
      JSON.stringify({ temperature: 0.7, max_tokens: 4096 }),
      1
    );

    console.log('Default Anthropic profile created');
  } else {
    // Update existing profile's system prompt to Edos identity
    db.prepare('UPDATE model_profiles SET system_prompt = ? WHERE id = ?')
      .run(edosSystemPrompt, 'default-anthropic');
    console.log('Default Anthropic profile updated with Edos identity');
  }

  // Check if default Ollama profile already exists
  const existingOllama = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get('default-ollama');

  if (!existingOllama) {
    const stmt = db.prepare(`
      INSERT INTO model_profiles (id, name, provider, model_id, system_prompt, parameters, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      'default-ollama',
      'EDOS Local (Ollama)',
      'ollama',
      OLLAMA_CONFIG.utilityModel,
      edosSystemPrompt,
      JSON.stringify({ temperature: 0.7, num_predict: 4096 }),
      0  // Not active by default
    );

    console.log('Default Ollama profile created');
  }
}
