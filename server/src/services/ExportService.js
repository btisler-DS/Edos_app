import { getDb } from '../db/connection.js';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../edos.db');

/**
 * Export service for data sovereignty
 * Supports SQLite, JSON, and Markdown exports
 */
export class ExportService {
  /**
   * Export full database as SQLite file
   * Performs WAL checkpoint first for consistency
   * @param {string} outputPath - Path to save the database copy
   * @returns {object} Export result
   */
  static exportDatabase(outputPath) {
    const db = getDb();

    // Checkpoint WAL to ensure all data is in main file
    db.pragma('wal_checkpoint(TRUNCATE)');

    // Copy the database file
    copyFileSync(DB_PATH, outputPath);

    // Get stats
    const stats = {
      sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get().count,
      messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
      projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
    };

    return {
      success: true,
      path: outputPath,
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export all data as JSON
   * @param {object} options - Export options
   * @param {string[]} options.sessionIds - Specific sessions to export (null for all)
   * @param {boolean} options.includeEmbeddings - Include embedding vectors (large)
   * @returns {object} Full data export
   */
  static exportAsJson(options = {}) {
    const { sessionIds = null, includeEmbeddings = false } = options;
    const db = getDb();

    // Export sessions
    let sessionsQuery = `
      SELECT s.*,
             m.orientation_blurb, m.unresolved_edge, m.last_pivot, m.regenerated_at
      FROM sessions s
      LEFT JOIN session_metadata m ON s.id = m.session_id
    `;
    if (sessionIds && sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      sessionsQuery += ` WHERE s.id IN (${placeholders})`;
    }
    sessionsQuery += ' ORDER BY s.created_at ASC';

    const sessions = sessionIds
      ? db.prepare(sessionsQuery).all(...sessionIds)
      : db.prepare(sessionsQuery).all();

    // Export messages for these sessions
    const sessionIdList = sessions.map(s => s.id);
    const messages = sessionIdList.length > 0
      ? db.prepare(`
          SELECT * FROM messages
          WHERE session_id IN (${sessionIdList.map(() => '?').join(',')})
          ORDER BY created_at ASC
        `).all(...sessionIdList)
      : [];

    // Export projects
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();

    // Export model profiles
    const profiles = db.prepare('SELECT * FROM model_profiles ORDER BY created_at ASC').all();

    // Export anchors
    const anchors = sessionIdList.length > 0
      ? db.prepare(`
          SELECT * FROM anchors
          WHERE session_id IN (${sessionIdList.map(() => '?').join(',')})
        `).all(...sessionIdList)
      : [];

    // Export inquiry links
    const inquiryLinks = db.prepare('SELECT * FROM inquiry_links ORDER BY created_at ASC').all();

    // Export session context (documents)
    const sessionContext = sessionIdList.length > 0
      ? db.prepare(`
          SELECT * FROM session_context
          WHERE session_id IN (${sessionIdList.map(() => '?').join(',')})
        `).all(...sessionIdList)
      : [];

    // Optionally include embeddings (warning: large)
    let embeddings = [];
    if (includeEmbeddings) {
      embeddings = db.prepare('SELECT * FROM embeddings').all();
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: {
        sessions: sessions.length,
        messages: messages.length,
        projects: projects.length,
        profiles: profiles.length,
        anchors: anchors.length,
        inquiryLinks: inquiryLinks.length,
        documents: sessionContext.length,
        embeddings: embeddings.length,
      },
      data: {
        sessions,
        messages,
        projects,
        profiles,
        anchors,
        inquiryLinks,
        sessionContext,
        embeddings: includeEmbeddings ? embeddings : undefined,
      },
    };
  }

  /**
   * Export sessions as Markdown files with YAML frontmatter
   * @param {object} options - Export options
   * @param {string[]} options.sessionIds - Specific sessions (null for all)
   * @returns {object[]} Array of {filename, content} objects
   */
  static exportAsMarkdown(options = {}) {
    const { sessionIds = null } = options;
    const db = getDb();

    // Get sessions
    let sessionsQuery = `
      SELECT s.*,
             m.orientation_blurb, m.unresolved_edge, m.last_pivot,
             p.name as project_name
      FROM sessions s
      LEFT JOIN session_metadata m ON s.id = m.session_id
      LEFT JOIN projects p ON s.project_id = p.id
    `;
    if (sessionIds && sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      sessionsQuery += ` WHERE s.id IN (${placeholders})`;
    }
    sessionsQuery += ' ORDER BY s.created_at ASC';

    const sessions = sessionIds
      ? db.prepare(sessionsQuery).all(...sessionIds)
      : db.prepare(sessionsQuery).all();

    const files = [];

    for (const session of sessions) {
      // Get messages for this session
      const messages = db.prepare(`
        SELECT role, content, created_at
        FROM messages
        WHERE session_id = ?
        ORDER BY created_at ASC
      `).all(session.id);

      // Build YAML frontmatter
      const frontmatter = {
        id: session.id,
        title: session.title || 'Untitled',
        created: session.created_at,
        lastActive: session.last_active_at,
        project: session.project_name || null,
        model: session.model_id,
        provider: session.provider,
        orientation: session.orientation_blurb || null,
        unresolvedEdge: session.unresolved_edge || null,
        lastPivot: session.last_pivot || null,
      };

      // Build markdown content
      let markdown = '---\n';
      for (const [key, value] of Object.entries(frontmatter)) {
        if (value !== null && value !== undefined) {
          if (typeof value === 'string' && (value.includes(':') || value.includes('\n'))) {
            markdown += `${key}: |\n  ${value.split('\n').join('\n  ')}\n`;
          } else {
            markdown += `${key}: ${JSON.stringify(value)}\n`;
          }
        }
      }
      markdown += '---\n\n';

      // Add title as H1
      markdown += `# ${session.title || 'Untitled'}\n\n`;

      // Add orientation if available
      if (session.orientation_blurb) {
        markdown += `> ${session.orientation_blurb}\n\n`;
      }

      // Add messages
      for (const msg of messages) {
        const roleLabel = msg.role === 'user' ? '**You:**' : '**Edos:**';
        const timestamp = new Date(msg.created_at).toLocaleString();
        markdown += `### ${roleLabel}\n`;
        markdown += `*${timestamp}*\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += '---\n\n';
      }

      // Add unresolved edge if present
      if (session.unresolved_edge && session.unresolved_edge !== 'None apparent.') {
        markdown += `## Open Question\n\n`;
        markdown += `${session.unresolved_edge}\n`;
      }

      // Generate filename
      const dateStr = session.created_at.split('T')[0];
      const safeTitle = (session.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .substring(0, 50);
      const filename = `${dateStr}-${safeTitle}.md`;

      files.push({ filename, content: markdown, sessionId: session.id });
    }

    return files;
  }

  /**
   * Export a single session as markdown
   * @param {string} sessionId - Session ID
   * @returns {object} {filename, content}
   */
  static exportSessionAsMarkdown(sessionId) {
    const files = this.exportAsMarkdown({ sessionIds: [sessionId] });
    return files[0] || null;
  }

  /**
   * Get export statistics
   * @returns {object} Database statistics
   */
  static getStats() {
    const db = getDb();

    return {
      sessions: db.prepare('SELECT COUNT(*) as count FROM sessions').get().count,
      messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
      projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      documents: db.prepare('SELECT COUNT(*) as count FROM session_context').get().count,
      anchors: db.prepare('SELECT COUNT(*) as count FROM anchors').get().count,
      embeddings: db.prepare('SELECT COUNT(*) as count FROM embeddings').get().count,
      inquiryLinks: db.prepare('SELECT COUNT(*) as count FROM inquiry_links').get().count,
      databaseSizeBytes: this.getDatabaseSize(),
    };
  }

  /**
   * Get database file size
   * @returns {number} Size in bytes
   */
  static getDatabaseSize() {
    try {
      const { statSync } = require('fs');
      const stats = statSync(DB_PATH);
      return stats.size;
    } catch {
      return 0;
    }
  }
}
