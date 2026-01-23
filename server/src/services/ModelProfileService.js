import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class ModelProfileService {
  /**
   * Get all model profiles
   */
  static getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM model_profiles ORDER BY created_at DESC').all();
  }

  /**
   * Get a model profile by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM model_profiles WHERE id = ?').get(id);
  }

  /**
   * Get the currently active model profile
   */
  static getActive() {
    const db = getDb();
    return db.prepare('SELECT * FROM model_profiles WHERE is_active = 1').get();
  }

  /**
   * Create a new model profile
   */
  static create({ name, provider, model_id, system_prompt, parameters }) {
    const db = getDb();
    const id = generatePrefixedId('prof');
    const timestamp = now();

    db.prepare(`
      INSERT INTO model_profiles (id, name, provider, model_id, system_prompt, parameters, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(id, name, provider, model_id, system_prompt, JSON.stringify(parameters || {}), timestamp, timestamp);

    return this.getById(id);
  }

  /**
   * Update a model profile
   */
  static update(id, updates) {
    const db = getDb();
    const current = this.getById(id);
    if (!current) {
      throw new Error(`Profile not found: ${id}`);
    }

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.provider !== undefined) {
      fields.push('provider = ?');
      values.push(updates.provider);
    }
    if (updates.model_id !== undefined) {
      fields.push('model_id = ?');
      values.push(updates.model_id);
    }
    if (updates.system_prompt !== undefined) {
      fields.push('system_prompt = ?');
      values.push(updates.system_prompt);
    }
    if (updates.parameters !== undefined) {
      fields.push('parameters = ?');
      values.push(JSON.stringify(updates.parameters));
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(now());
      values.push(id);

      db.prepare(`UPDATE model_profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getById(id);
  }

  /**
   * Set a profile as active (deactivates all others)
   */
  static setActive(id) {
    const db = getDb();
    const profile = this.getById(id);
    if (!profile) {
      throw new Error(`Profile not found: ${id}`);
    }

    // Transaction to ensure only one active profile
    const setActive = db.transaction(() => {
      db.prepare('UPDATE model_profiles SET is_active = 0').run();
      db.prepare('UPDATE model_profiles SET is_active = 1, updated_at = ? WHERE id = ?').run(now(), id);
    });

    setActive();
    return this.getById(id);
  }

  /**
   * Delete a model profile (cannot delete the active profile)
   */
  static delete(id) {
    const db = getDb();
    const profile = this.getById(id);

    if (!profile) {
      throw new Error(`Profile not found: ${id}`);
    }
    if (profile.is_active) {
      throw new Error('Cannot delete the active profile');
    }

    db.prepare('DELETE FROM model_profiles WHERE id = ?').run(id);
    return true;
  }
}
