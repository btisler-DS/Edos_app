import { Router } from 'express';
import { BackupService } from '../services/BackupService.js';

const router = Router();

/**
 * GET /api/backup/list
 * List available backups
 */
router.get('/list', (req, res) => {
  try {
    const backups = BackupService.listBackups();
    res.json({
      backups,
      directory: BackupService.getBackupDir(),
    });
  } catch (error) {
    console.error('[Backup] list error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/backup/create
 * Create a new backup
 */
router.post('/create', async (req, res) => {
  try {
    const { compress = true, password } = req.body || {};

    const result = await BackupService.createBackup({
      compress,
      password,
    });

    res.json(result);
  } catch (error) {
    console.error('[Backup] create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/backup/:filename
 * Delete a specific backup
 */
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backups = BackupService.listBackups();
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const { unlinkSync } = require('fs');
    unlinkSync(backup.path);

    res.json({ success: true, deleted: filename });
  } catch (error) {
    console.error('[Backup] delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/backup/prune
 * Delete old backups, keeping only the most recent N
 */
router.post('/prune', (req, res) => {
  try {
    const { keepCount = 7 } = req.body || {};
    const deleted = BackupService.pruneBackups(keepCount);

    res.json({
      success: true,
      deleted,
      remaining: BackupService.listBackups().length,
    });
  } catch (error) {
    console.error('[Backup] prune error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backup/config
 * Get backup configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = BackupService.getConfig();
    res.json(config);
  } catch (error) {
    console.error('[Backup] config error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backup/download/:filename
 * Download a backup file
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const backups = BackupService.listBackups();
    const backup = backups.find(b => b.filename === filename);

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(backup.path, filename);
  } catch (error) {
    console.error('[Backup] download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
