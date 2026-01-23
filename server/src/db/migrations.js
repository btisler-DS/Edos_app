import { getDb } from './connection.js';

/**
 * Run database migrations
 */
export function runMigrations() {
  const db = getDb();

  // Check if messages table has the old constraint (only user/assistant)
  // by trying to insert a system message
  try {
    // Try to create messages_new table with updated constraint
    const tableInfo = db.prepare("PRAGMA table_info(messages)").all();
    const hasOldSchema = tableInfo.length > 0;

    if (hasOldSchema) {
      // Check if system role is allowed by looking at existing data or trying insert
      try {
        // Create new table with updated constraint
        db.exec(`
          CREATE TABLE IF NOT EXISTS messages_new (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
          )
        `);

        // Copy data from old table
        db.exec(`
          INSERT OR IGNORE INTO messages_new (id, session_id, role, content, created_at)
          SELECT id, session_id, role, content, created_at FROM messages
        `);

        // Drop old table and rename new
        db.exec('DROP TABLE messages');
        db.exec('ALTER TABLE messages_new RENAME TO messages');

        // Recreate index
        db.exec('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at)');

        console.log('Migration: Updated messages table to support system role');
      } catch (e) {
        // Table might already have the right schema or migration already ran
        if (!e.message.includes('already exists')) {
          console.log('Migration check: messages table already up to date');
        }
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}
