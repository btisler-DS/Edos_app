-- ============================================
-- EDOS Schema v0.2
-- ============================================

-- Projects (containers for inquiries)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Model Profiles (pinned AI configurations)
CREATE TABLE IF NOT EXISTS model_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai')),
    model_id TEXT NOT NULL,
    system_prompt TEXT,
    parameters TEXT,                -- JSON: temperature, max_tokens, etc.
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Sessions (continuous inquiries)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,                     -- AI-generated, stable after creation
    model_profile_id TEXT NOT NULL,
    project_id TEXT,                -- Optional project grouping
    user_id TEXT DEFAULT 'default', -- Future-proofing
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (model_profile_id) REFERENCES model_profiles(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Messages (turns within sessions)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Re-entry Metadata (auto-generated, overwritable)
CREATE TABLE IF NOT EXISTS session_metadata (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    orientation_blurb TEXT,         -- "What this was about"
    unresolved_edge TEXT,           -- "Why it didn't close"
    last_pivot TEXT,                -- "Where momentum changed"
    generated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Session Context (uploaded files, read-only reference material)
CREATE TABLE IF NOT EXISTS session_context (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('file_upload')),
    source_name TEXT,               -- Original filename
    content TEXT NOT NULL,          -- Extracted text content
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Anchors (user-created bookmarks within conversations)
CREATE TABLE IF NOT EXISTS anchors (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    label TEXT NOT NULL,            -- User-provided label
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Document Chunks (for semantic search over uploaded documents)
CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    context_id TEXT NOT NULL,           -- FK to session_context
    chunk_index INTEGER NOT NULL,       -- Position within source document
    source_name TEXT NOT NULL,          -- Original filename
    content TEXT NOT NULL,              -- Chunk text
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (context_id) REFERENCES session_context(id) ON DELETE CASCADE
);

-- Embeddings (vector storage for semantic similarity)
CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('session_summary', 'document_chunk')),
    source_id TEXT NOT NULL,            -- FK to session or document_chunk
    vector TEXT NOT NULL,               -- JSON array of floats
    dim INTEGER NOT NULL,               -- Dimension count (e.g., 1536)
    model TEXT NOT NULL,                -- Model used (e.g., text-embedding-3-small)
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source_type, source_id)
);

-- Lenses (future: named filters/perspectives for similarity queries)
CREATE TABLE IF NOT EXISTS lenses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    config TEXT,                        -- JSON configuration
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_context ON document_chunks(context_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
