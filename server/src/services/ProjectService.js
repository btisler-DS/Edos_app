import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { now } from '../utils/time.js';

export class ProjectService {
  /**
   * Get all projects
   */
  static getAll() {
    const db = getDb();
    return db.prepare('SELECT * FROM projects ORDER BY name ASC').all();
  }

  /**
   * Get a project by ID
   */
  static getById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  }

  /**
   * Get the default project (General)
   */
  static getDefault() {
    const db = getDb();
    return db.prepare("SELECT * FROM projects WHERE name = 'General'").get();
  }

  /**
   * Create a new project
   */
  static create({ name, description }) {
    const db = getDb();
    const id = generatePrefixedId('proj');
    const timestamp = now();

    db.prepare(`
      INSERT INTO projects (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description || null, timestamp, timestamp);

    return this.getById(id);
  }

  /**
   * Update a project
   */
  static update(id, updates) {
    const db = getDb();
    const current = this.getById(id);
    if (!current) {
      throw new Error(`Project not found: ${id}`);
    }

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (fields.length > 0) {
      fields.push('updated_at = ?');
      values.push(now());
      values.push(id);

      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getById(id);
  }

  /**
   * Delete a project (moves sessions to General)
   */
  static delete(id) {
    const db = getDb();
    const project = this.getById(id);

    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }

    if (project.name === 'General') {
      throw new Error('Cannot delete the default project');
    }

    // Move all sessions to null (unassigned) before deleting
    db.prepare('UPDATE sessions SET project_id = NULL WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    return true;
  }

  /**
   * Get session count by project
   */
  static getSessionCounts() {
    const db = getDb();
    const counts = db.prepare(`
      SELECT
        COALESCE(project_id, 'unassigned') as project_id,
        COUNT(*) as count
      FROM sessions
      GROUP BY project_id
    `).all();

    const result = {};
    counts.forEach(row => {
      result[row.project_id] = row.count;
    });
    return result;
  }
}
