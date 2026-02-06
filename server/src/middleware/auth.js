/**
 * EDOS Authentication Middleware
 *
 * Protects API routes when authentication is enabled.
 */

import { AuthService } from '../services/AuthService.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Middleware to require authentication
 * Skips authentication if it's not enabled (local-only mode)
 */
export function requireAuth(req, res, next) {
  // Skip auth if not enabled
  if (!AuthService.isEnabled()) {
    req.user = { userId: 'default' };
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const token = authHeader.substring(7);
  const user = AuthService.verifyToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware to optionally authenticate
 * Adds user to request if token is valid, but doesn't block if not
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  if (!req.user) {
    req.user = { userId: 'default' };
  }

  next();
}

export default { requireAuth, optionalAuth };
