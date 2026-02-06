/**
 * EDOS Authentication Routes
 */

import { Router } from 'express';
import { AuthService } from '../services/AuthService.js';
import { asyncHandler } from '../utils/errors.js';
import { validateRequest, rules } from '../utils/validate.js';

const router = Router();

// GET /api/auth/status - Check if auth is required
router.get('/status', (req, res) => {
  res.json(AuthService.getStatus());
});

// POST /api/auth/setup - First-time password setup
router.post('/setup', validateRequest({
  'body.password': [rules.required, rules.string, rules.minLength(8)],
}), asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Only allow setup if not already configured
  if (AuthService.isConfigured()) {
    return res.status(400).json({
      error: 'Authentication already configured',
      code: 'ALREADY_CONFIGURED',
    });
  }

  AuthService.setupPassword(password);
  res.json({ success: true, message: 'Password configured successfully' });
}));

// POST /api/auth/login - Login with password
router.post('/login', validateRequest({
  'body.password': [rules.required, rules.string],
}), asyncHandler(async (req, res) => {
  const { password } = req.body;
  const result = AuthService.login(password);
  res.json(result);
}));

// POST /api/auth/change-password - Change password (requires current password)
router.post('/change-password', validateRequest({
  'body.currentPassword': [rules.required, rules.string],
  'body.newPassword': [rules.required, rules.string, rules.minLength(8)],
}), asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  AuthService.changePassword(currentPassword, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
}));

export default router;
