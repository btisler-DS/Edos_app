import { getDb } from '../db/connection.js';
import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../edos.db');

// Default backup directory (can be overridden via env)
const DEFAULT_BACKUP_DIR = join(__dirname, '../../backups');

/**
 * Backup service for automated and manual database backups
 */
export class BackupService {
  static backupInterval = null;

  /**
   * Get backup directory from env or default
   */
  static getBackupDir() {
    return process.env.BACKUP_DIR || DEFAULT_BACKUP_DIR;
  }

  /**
   * Ensure backup directory exists
   */
  static ensureBackupDir() {
    const dir = this.getBackupDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Create a backup of the database
   * @param {object} options - Backup options
   * @param {boolean} options.compress - Compress with gzip
   * @param {string} options.password - Optional password for encryption
   * @returns {object} Backup result
   */
  static async createBackup(options = {}) {
    const { compress = true, password = null } = options;
    const db = getDb();

    // Checkpoint WAL to ensure all data is in main file
    db.pragma('wal_checkpoint(TRUNCATE)');

    const backupDir = this.ensureBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `edos-backup-${timestamp}.db`;

    if (compress) filename += '.gz';
    if (password) filename += '.enc';

    const backupPath = join(backupDir, filename);

    try {
      if (!compress && !password) {
        // Simple copy
        copyFileSync(DB_PATH, backupPath);
      } else if (compress && !password) {
        // Compressed backup
        await pipeline(
          createReadStream(DB_PATH),
          createGzip(),
          createWriteStream(backupPath)
        );
      } else if (password) {
        // Encrypted backup (with optional compression)
        const key = scryptSync(password, 'edos-salt', 32);
        const iv = randomBytes(16);
        const cipher = createCipheriv('aes-256-cbc', key, iv);

        const streams = [createReadStream(DB_PATH)];
        if (compress) streams.push(createGzip());
        streams.push(cipher);
        streams.push(createWriteStream(backupPath));

        // Write IV to beginning of file
        const output = createWriteStream(backupPath);
        output.write(iv);

        if (compress) {
          await pipeline(
            createReadStream(DB_PATH),
            createGzip(),
            cipher,
            output
          );
        } else {
          await pipeline(
            createReadStream(DB_PATH),
            cipher,
            output
          );
        }
      }

      const stats = statSync(backupPath);

      return {
        success: true,
        filename,
        path: backupPath,
        size: stats.size,
        timestamp: new Date().toISOString(),
        compressed: compress,
        encrypted: !!password,
      };
    } catch (error) {
      console.error('[BackupService] Backup failed:', error);
      throw new Error('Backup failed: ' + error.message);
    }
  }

  /**
   * List available backups
   * @returns {object[]} Array of backup info
   */
  static listBackups() {
    const backupDir = this.getBackupDir();
    if (!existsSync(backupDir)) {
      return [];
    }

    const files = readdirSync(backupDir)
      .filter(f => f.startsWith('edos-backup-'))
      .map(filename => {
        const filepath = join(backupDir, filename);
        const stats = statSync(filepath);
        return {
          filename,
          path: filepath,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          compressed: filename.includes('.gz'),
          encrypted: filename.includes('.enc'),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  }

  /**
   * Delete old backups, keeping only the most recent N
   * @param {number} keepCount - Number of backups to keep
   * @returns {number} Number of deleted backups
   */
  static pruneBackups(keepCount = 7) {
    const backups = this.listBackups();
    const toDelete = backups.slice(keepCount);

    for (const backup of toDelete) {
      try {
        unlinkSync(backup.path);
        console.log(`[BackupService] Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`[BackupService] Failed to delete ${backup.filename}:`, error);
      }
    }

    return toDelete.length;
  }

  /**
   * Start scheduled backups
   * @param {object} options - Schedule options
   * @param {number} options.intervalHours - Hours between backups (default: 24)
   * @param {number} options.keepCount - Backups to keep (default: 7)
   * @param {boolean} options.compress - Compress backups (default: true)
   */
  static startScheduledBackups(options = {}) {
    const {
      intervalHours = 24,
      keepCount = 7,
      compress = true,
    } = options;

    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Run backup immediately on start
    this.runScheduledBackup({ compress, keepCount });

    // Schedule recurring backups
    this.backupInterval = setInterval(() => {
      this.runScheduledBackup({ compress, keepCount });
    }, intervalMs);

    console.log(`[BackupService] Scheduled backups every ${intervalHours} hours`);
  }

  /**
   * Stop scheduled backups
   */
  static stopScheduledBackups() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      console.log('[BackupService] Scheduled backups stopped');
    }
  }

  /**
   * Run a scheduled backup
   */
  static async runScheduledBackup(options = {}) {
    const { compress = true, keepCount = 7 } = options;

    try {
      console.log('[BackupService] Running scheduled backup...');
      const result = await this.createBackup({ compress });
      console.log(`[BackupService] Backup created: ${result.filename}`);

      // Prune old backups
      const deleted = this.pruneBackups(keepCount);
      if (deleted > 0) {
        console.log(`[BackupService] Pruned ${deleted} old backup(s)`);
      }
    } catch (error) {
      console.error('[BackupService] Scheduled backup failed:', error);
    }
  }

  /**
   * Get backup configuration from environment
   */
  static getConfig() {
    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS, 10) || 24,
      keepCount: parseInt(process.env.BACKUP_KEEP_COUNT, 10) || 7,
      directory: this.getBackupDir(),
      compress: process.env.BACKUP_COMPRESS !== 'false',
    };
  }
}
