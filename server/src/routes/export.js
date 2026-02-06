import { Router } from 'express';
import { ExportService } from '../services/ExportService.js';
import { join } from 'path';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import archiver from 'archiver';

const router = Router();

/**
 * GET /api/export/stats
 * Get export statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = ExportService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('[Export] stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/json
 * Export all data as JSON
 */
router.get('/json', (req, res) => {
  try {
    const { includeEmbeddings } = req.query;

    const data = ExportService.exportAsJson({
      includeEmbeddings: includeEmbeddings === 'true',
    });

    const filename = `edos-export-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);
  } catch (error) {
    console.error('[Export] JSON error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/database
 * Export full SQLite database
 */
router.get('/database', (req, res) => {
  try {
    const filename = `edos-backup-${new Date().toISOString().split('T')[0]}.db`;
    const tempPath = join(tmpdir(), filename);

    const result = ExportService.exportDatabase(tempPath);

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(tempPath);
  } catch (error) {
    console.error('[Export] database error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/markdown
 * Export sessions as Markdown files (ZIP archive)
 */
router.get('/markdown', async (req, res) => {
  try {
    const { sessionIds } = req.query;
    const sessionIdArray = sessionIds ? sessionIds.split(',') : null;

    const files = ExportService.exportAsMarkdown({ sessionIds: sessionIdArray });

    if (files.length === 0) {
      return res.status(404).json({ error: 'No sessions to export' });
    }

    // If single file, return directly
    if (files.length === 1) {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${files[0].filename}"`);
      return res.send(files[0].content);
    }

    // Multiple files: create ZIP archive
    const filename = `edos-markdown-${new Date().toISOString().split('T')[0]}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('[Export] Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });

    archive.pipe(res);

    for (const file of files) {
      archive.append(file.content, { name: file.filename });
    }

    await archive.finalize();
  } catch (error) {
    console.error('[Export] markdown error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/export/session/:id/markdown
 * Export single session as Markdown
 */
router.get('/session/:id/markdown', (req, res) => {
  try {
    const file = ExportService.exportSessionAsMarkdown(req.params.id);

    if (!file) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.content);
  } catch (error) {
    console.error('[Export] session markdown error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
