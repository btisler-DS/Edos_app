import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

/**
 * Get the database connection (singleton)
 */
export function getDb() {
  if (!db) {
    const dbPath = join(__dirname, '../../edos.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Initialize the database schema
 */
export function initializeSchema() {
  const db = getDb();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database schema initialized');
}

/**
 * Close the database connection
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
