/**
 * EDOS Authentication Service
 *
 * Single-user JWT authentication for remote access.
 * Uses Node.js crypto for password hashing (no external dependencies).
 */

import crypto from 'crypto';
import { getDb } from '../db/connection.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';

// JWT-like token implementation using crypto
// In production, consider using the 'jose' or 'jsonwebtoken' package

const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 days
const TOKEN_SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');

/**
 * Hash a password using PBKDF2
 */
function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify a password against a stored hash
 */
function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generate a signed token
 */
function generateToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    iat: Date.now(),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a token
 */
function verifyToken(token) {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  // Decode and check expiry
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    if (payload.exp < Date.now()) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export const AuthService = {
  /**
   * Check if authentication is configured (password is set)
   */
  isConfigured() {
    try {
      const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('auth_password_hash');
      return !!row;
    } catch {
      return false;
    }
  },

  /**
   * Check if authentication is enabled
   * Returns false if no password is set (local-only mode)
   */
  isEnabled() {
    // Auth is enabled if AUTH_ENABLED=true OR if a password has been set
    if (process.env.AUTH_ENABLED === 'true') {
      return true;
    }
    return this.isConfigured();
  },

  /**
   * Set up initial password (first-time setup)
   */
  setupPassword(password) {
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const { hash, salt } = hashPassword(password);

    getDb().prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `).run('auth_password_hash', hash);

    getDb().prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `).run('auth_password_salt', salt);

    return { success: true };
  },

  /**
   * Authenticate with password and return token
   */
  login(password) {
    if (!this.isConfigured()) {
      throw new ForbiddenError('Authentication not configured');
    }

    const hashRow = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('auth_password_hash');
    const saltRow = getDb().prepare('SELECT value FROM settings WHERE key = ?').get('auth_password_salt');

    if (!hashRow || !saltRow) {
      throw new ForbiddenError('Authentication not configured');
    }

    if (!verifyPassword(password, hashRow.value, saltRow.value)) {
      throw new ForbiddenError('Invalid password');
    }

    const token = generateToken('default');
    return { token, expiresIn: TOKEN_EXPIRY_HOURS * 60 * 60 };
  },

  /**
   * Verify a token and return the user info
   */
  verifyToken(token) {
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }
    return { userId: payload.userId };
  },

  /**
   * Change password (requires current password)
   */
  changePassword(currentPassword, newPassword) {
    // Verify current password first
    this.login(currentPassword);

    // Set new password
    return this.setupPassword(newPassword);
  },

  /**
   * Get auth status (for frontend to know if login is required)
   */
  getStatus() {
    return {
      enabled: this.isEnabled(),
      configured: this.isConfigured(),
    };
  },
};

export default AuthService;
