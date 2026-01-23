import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { MessageService } from '../services/MessageService.js';

const router = Router();

// GET /api/sessions - List all sessions
router.get('/', (req, res) => {
  try {
    const sessions = SessionService.getAll();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', (req, res) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions - Create new session (New Inquiry)
router.post('/', (req, res) => {
  try {
    const session = SessionService.create();
    res.status(201).json(session);
  } catch (error) {
    if (error.message.includes('No active model profile')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id/messages - Get all messages for a session
router.get('/:id/messages', (req, res) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = MessageService.getBySessionId(req.params.id);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', (req, res) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    SessionService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
