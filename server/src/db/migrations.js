import { getDb } from './connection.js';
import { generatePrefixedId } from '../utils/ids.js';

/**
 * Run database migrations
 */
export function runMigrations() {
  const db = getDb();

  // Migration: Add settings table for auth and configuration
  migrateSettings(db);

  // Migration: Add projects table and project_id to sessions
  migrateProjects(db);

  // Migration: Add semantic memory tables (embeddings, document_chunks, lenses)
  migrateSemanticMemory(db);

  // Migration: Update session_context to allow assembled_sessions source_type
  migrateSessionContextSourceType(db);

  // Migration: Add inquiry_links table for longitudinal continuity
  migrateInquiryLinks(db);

  // Migration: Add imported flag to sessions (v2 archival ingestion)
  migrateImportedFlag(db);

  // Migration: Add session control columns (pinned, archived, title_locked)
  migrateSessionControls(db);

  // Migration: Add web_search source_type to session_context
  migrateWebSearchSourceType(db);

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

/**
 * Migration: Add settings table for authentication and configuration
 */
function migrateSettings(db) {
  try {
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
    ).get();

    if (!table) {
      db.exec(`
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('Migration: Created settings table');
    }
  } catch (error) {
    console.error('Settings migration error:', error.message);
  }
}

/**
 * Migration: Add projects table and project_id column to sessions
 */
function migrateProjects(db) {
  try {
    // Check if projects table exists
    const projectsTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    ).get();

    if (!projectsTable) {
      // Create projects table
      db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('Migration: Created projects table');
    }

    // Ensure General project exists (may need to seed even if table exists)
    const generalProject = db.prepare("SELECT id FROM projects WHERE name = 'General'").get();
    if (!generalProject) {
      const defaultId = generatePrefixedId('proj');
      db.prepare(`
        INSERT INTO projects (id, name, description)
        VALUES (?, 'General', 'Default project for ungrouped inquiries')
      `).run(defaultId);
      console.log('Migration: Created default General project');
    }

    // Check if sessions has project_id column
    const columns = db.prepare("PRAGMA table_info(sessions)").all();
    const hasProjectId = columns.some(col => col.name === 'project_id');

    if (!hasProjectId) {
      // Add project_id column to sessions
      db.exec('ALTER TABLE sessions ADD COLUMN project_id TEXT');

      // Create index for project filtering
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id)');

      console.log('Migration: Added project_id column to sessions');
    }
  } catch (error) {
    console.error('Projects migration error:', error.message);
  }

  // Phase 7.1: Sessions with project_id = NULL are valid (no auto-assignment)
}

/**
 * Migration: Add semantic memory tables (embeddings, document_chunks, lenses)
 */
function migrateSemanticMemory(db) {
  try {
    // Check if document_chunks table exists
    const chunksTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='document_chunks'"
    ).get();

    if (!chunksTable) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id TEXT PRIMARY KEY,
          context_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          source_name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (context_id) REFERENCES session_context(id) ON DELETE CASCADE
        )
      `);
      db.exec('CREATE INDEX IF NOT EXISTS idx_chunks_context ON document_chunks(context_id)');
      console.log('Migration: Created document_chunks table');
    }

    // Check if embeddings table exists
    const embeddingsTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='embeddings'"
    ).get();

    if (!embeddingsTable) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL CHECK (source_type IN ('session_summary', 'document_chunk')),
          source_id TEXT NOT NULL,
          vector TEXT NOT NULL,
          dim INTEGER NOT NULL,
          model TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(source_type, source_id)
        )
      `);
      db.exec('CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id)');
      console.log('Migration: Created embeddings table');
    }

    // Check if lenses table exists
    const lensesTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='lenses'"
    ).get();

    if (!lensesTable) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS lenses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          config TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);
      console.log('Migration: Created lenses table');
    }
  } catch (error) {
    console.error('Semantic memory migration error:', error.message);
  }
}

/**
 * Migration: Update session_context CHECK constraint to allow assembled_sessions
 */
function migrateSessionContextSourceType(db) {
  try {
    // Check current constraint by trying to see the table structure
    // SQLite doesn't allow altering CHECK constraints, so we need to recreate the table
    const tableInfo = db.prepare("PRAGMA table_info(session_context)").all();
    if (tableInfo.length === 0) return; // Table doesn't exist yet

    // Check if we need to migrate by testing if assembled_sessions is allowed
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS session_context_new (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          source_type TEXT NOT NULL CHECK (source_type IN ('file_upload', 'assembled_sessions')),
          source_name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
      `);

      // Copy existing data
      db.exec(`
        INSERT OR IGNORE INTO session_context_new (id, session_id, source_type, source_name, content, created_at)
        SELECT id, session_id, source_type, source_name, content, created_at FROM session_context
      `);

      // Drop old table and rename new
      db.exec('DROP TABLE session_context');
      db.exec('ALTER TABLE session_context_new RENAME TO session_context');

      // Recreate index
      db.exec('CREATE INDEX IF NOT EXISTS idx_context_session ON session_context(session_id)');

      console.log('Migration: Updated session_context to allow assembled_sessions source_type');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('no such table')) {
        // Migration already complete or table doesn't need migration
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('Session context migration error:', error.message);
  }
}

/**
 * Migration: Add inquiry_links table for explicit longitudinal linking
 */
function migrateInquiryLinks(db) {
  try {
    const table = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='inquiry_links'"
    ).get();

    if (!table) {
      db.exec(`
        CREATE TABLE inquiry_links (
          id TEXT PRIMARY KEY,
          from_session_id TEXT NOT NULL,
          to_session_id TEXT NOT NULL,
          note TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (from_session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (to_session_id) REFERENCES sessions(id) ON DELETE CASCADE,
          UNIQUE(from_session_id, to_session_id)
        )
      `);
      db.exec('CREATE INDEX IF NOT EXISTS idx_links_from ON inquiry_links(from_session_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_links_to ON inquiry_links(to_session_id)');
      console.log('Migration: Created inquiry_links table');
    }
  } catch (error) {
    console.error('Inquiry links migration error:', error.message);
  }
}

/**
 * Migration: Add imported flag to sessions for v2 archival ingestion
 * Imported sessions are "books on a shelf" - discoverable but silent until engaged
 */
function migrateImportedFlag(db) {
  try {
    const columns = db.prepare("PRAGMA table_info(sessions)").all();
    const hasImported = columns.some(col => col.name === 'imported');

    if (!hasImported) {
      db.exec('ALTER TABLE sessions ADD COLUMN imported INTEGER DEFAULT 0');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_imported ON sessions(imported)');
      console.log('Migration: Added imported flag to sessions');
    }
  } catch (error) {
    console.error('Imported flag migration error:', error.message);
  }
}

/**
 * Migration: Add session control columns (pinned, archived, title_locked)
 * Phase 6: Explicit, reversible user control over inquiry objects
 */
function migrateSessionControls(db) {
  try {
    const columns = db.prepare("PRAGMA table_info(sessions)").all();
    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('pinned')) {
      db.exec('ALTER TABLE sessions ADD COLUMN pinned INTEGER DEFAULT 0');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_pinned ON sessions(pinned)');
      console.log('Migration: Added pinned column to sessions');
    }

    if (!columnNames.includes('archived')) {
      db.exec('ALTER TABLE sessions ADD COLUMN archived INTEGER DEFAULT 0');
      console.log('Migration: Added archived column to sessions');
    }

    if (!columnNames.includes('title_locked')) {
      db.exec('ALTER TABLE sessions ADD COLUMN title_locked INTEGER DEFAULT 0');
      // Backfill: imported sessions get title_locked = 1
      const result = db.prepare('UPDATE sessions SET title_locked = 1 WHERE imported = 1').run();
      if (result.changes > 0) {
        console.log(`Migration: Locked titles on ${result.changes} imported sessions`);
      }
      console.log('Migration: Added title_locked column to sessions');
    }
  } catch (error) {
    console.error('Session controls migration error:', error.message);
  }
}

/**
 * Migration: Add web_search source_type to session_context
 * Enables storing web search results as session context
 */
function migrateWebSearchSourceType(db) {
  try {
    // Check if session_context table exists
    const tableInfo = db.prepare("PRAGMA table_info(session_context)").all();
    if (tableInfo.length === 0) return; // Table doesn't exist yet

    // Try to insert a test row to check if web_search is allowed
    // If it fails, we need to migrate the table
    try {
      // Create new table with updated constraint
      db.exec(`
        CREATE TABLE IF NOT EXISTS session_context_ws (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          source_type TEXT NOT NULL CHECK (source_type IN ('file_upload', 'assembled_sessions', 'web_search', 'url_fetch')),
          source_name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
      `);

      // Copy existing data
      db.exec(`
        INSERT OR IGNORE INTO session_context_ws (id, session_id, source_type, source_name, content, created_at)
        SELECT id, session_id, source_type, source_name, content, created_at FROM session_context
      `);

      // Drop old table and rename new
      db.exec('DROP TABLE session_context');
      db.exec('ALTER TABLE session_context_ws RENAME TO session_context');

      // Recreate index
      db.exec('CREATE INDEX IF NOT EXISTS idx_context_session ON session_context(session_id)');

      console.log('Migration: Updated session_context to allow web_search source_type');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('no such table')) {
        // Migration already complete or table doesn't need migration
      } else if (e.message.includes('UNIQUE constraint')) {
        // Data already migrated
        db.exec('DROP TABLE IF EXISTS session_context_ws');
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error('Web search source type migration error:', error.message);
  }
}
