import { getDb } from './connection.js';
import { generatePrefixedId } from '../utils/ids.js';

/**
 * Seed the database with default data
 */
export function seedDatabase() {
  const db = getDb();

  // Check if default profile already exists
  const existing = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get('default-anthropic');

  const edosSystemPrompt = 'You are Edos, a persistent inquiry environment designed for deep thinking and re-entry. Engage thoughtfully with questions. Preserve context across exchanges. Help the user build understanding over time.';

  if (!existing) {
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

    console.log('Default model profile created');
  } else {
    // Update existing profile's system prompt to Edos identity
    db.prepare('UPDATE model_profiles SET system_prompt = ? WHERE id = ?')
      .run(edosSystemPrompt, 'default-anthropic');
    console.log('Default model profile updated with Edos identity');
  }
}
