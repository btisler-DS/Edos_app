import { getDb } from './connection.js';
import { generatePrefixedId } from '../utils/ids.js';

/**
 * Seed the database with default data
 */
export function seedDatabase() {
  const db = getDb();

  // Check if default profile already exists
  const existing = db.prepare('SELECT id FROM model_profiles WHERE id = ?').get('default-anthropic');

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
      'You are a thoughtful inquiry partner. Engage deeply with questions. Preserve context across exchanges.',
      JSON.stringify({ temperature: 0.7, max_tokens: 4096 }),
      1
    );

    console.log('Default model profile created');
  } else {
    console.log('Default model profile already exists');
  }
}
