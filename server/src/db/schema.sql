-- ============================================
-- EDOS Schema v0.1
-- ============================================

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
    user_id TEXT DEFAULT 'default', -- Future-proofing
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (model_profile_id) REFERENCES model_profiles(id)
);

-- Messages (turns within sessions)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
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

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
