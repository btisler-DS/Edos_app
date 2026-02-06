import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { formatRelativeTime } from '../utils/time.js';

const router = Router();

/**
 * GET /api/insights/unresolved
 * Get all sessions with unresolved edges (open questions)
 */
router.get('/unresolved', (req, res) => {
  try {
    const db = getDb();
    const { projectId, limit = 50 } = req.query;

    let query = `
      SELECT
        s.id,
        s.title,
        s.project_id,
        s.created_at,
        s.last_active_at,
        m.orientation_blurb,
        m.unresolved_edge,
        m.last_pivot,
        m.updated_at as metadata_updated_at,
        p.name as project_name
      FROM sessions s
      INNER JOIN session_metadata m ON s.id = m.session_id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE m.unresolved_edge IS NOT NULL
        AND m.unresolved_edge != ''
        AND m.unresolved_edge != 'None apparent.'
        AND m.unresolved_edge != 'None'
        AND s.archived_at IS NULL
    `;

    const params = [];

    if (projectId) {
      query += ' AND s.project_id = ?';
      params.push(projectId);
    }

    query += ' ORDER BY s.last_active_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const rows = db.prepare(query).all(...params);

    // Enrich with relative time
    const results = rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled',
      projectId: row.project_id,
      projectName: row.project_name,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      relativeTime: formatRelativeTime(row.last_active_at || row.created_at),
      orientationBlurb: row.orientation_blurb,
      unresolvedEdge: row.unresolved_edge,
      lastPivot: row.last_pivot,
    }));

    res.json({
      count: results.length,
      sessions: results,
    });
  } catch (error) {
    console.error('[Insights] unresolved error:', error);
    res.status(500).json({ error: error.message || 'Failed to get unresolved edges' });
  }
});

/**
 * POST /api/insights/resolve/:sessionId
 * Mark an unresolved edge as resolved
 */
router.post('/resolve/:sessionId', (req, res) => {
  try {
    const db = getDb();
    const { sessionId } = req.params;
    const { resolution } = req.body;

    // Update the metadata to clear the unresolved edge
    // Optionally store the resolution note
    const stmt = db.prepare(`
      UPDATE session_metadata
      SET unresolved_edge = ?,
          updated_at = datetime('now')
      WHERE session_id = ?
    `);

    const result = stmt.run(
      resolution ? `Resolved: ${resolution}` : 'Resolved',
      sessionId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session metadata not found' });
    }

    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('[Insights] resolve error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve edge' });
  }
});

/**
 * GET /api/insights/activity
 * Get activity summary for temporal patterns
 */
router.get('/activity', (req, res) => {
  try {
    const db = getDb();
    const { months = 12 } = req.query;

    // Get message counts by month
    const activityByMonth = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as message_count,
        COUNT(DISTINCT session_id) as session_count
      FROM messages
      WHERE created_at >= date('now', '-' || ? || ' months')
      GROUP BY month
      ORDER BY month ASC
    `).all(parseInt(months, 10));

    // Get most active sessions recently
    const recentActive = db.prepare(`
      SELECT
        s.id,
        s.title,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_at
      FROM sessions s
      INNER JOIN messages m ON s.id = m.session_id
      WHERE m.created_at >= date('now', '-30 days')
      GROUP BY s.id
      ORDER BY message_count DESC
      LIMIT 10
    `).all();

    // Get projects by activity
    const projectActivity = db.prepare(`
      SELECT
        p.id,
        p.name,
        COUNT(DISTINCT s.id) as session_count,
        COUNT(m.id) as message_count
      FROM projects p
      INNER JOIN sessions s ON p.id = s.project_id
      LEFT JOIN messages m ON s.id = m.session_id
      GROUP BY p.id
      ORDER BY message_count DESC
    `).all();

    res.json({
      byMonth: activityByMonth,
      recentActive: recentActive.map(s => ({
        ...s,
        relativeTime: formatRelativeTime(s.last_message_at),
      })),
      byProject: projectActivity,
    });
  } catch (error) {
    console.error('[Insights] activity error:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity' });
  }
});

export default router;
