import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { AnchorService } from '../services/AnchorService.js';

const router = Router();

// GET /api/sessions/:sessionId/anchors - Get all anchors for a session
router.get('/:sessionId/anchors', (req, res) => {
  try {
    const session = SessionService.getById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const anchors = AnchorService.getBySessionId(req.params.sessionId);
    res.json(anchors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sessions/:sessionId/anchors - Create an anchor
router.post('/:sessionId/anchors', (req, res) => {
  try {
    const { messageId, label } = req.body;

    if (!messageId || !label) {
      return res.status(400).json({ error: 'messageId and label are required' });
    }

    const session = SessionService.getById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if anchor already exists for this message
    const existing = AnchorService.getByMessageId(messageId);
    if (existing) {
      return res.status(409).json({ error: 'Anchor already exists for this message', anchor: existing });
    }

    const anchor = AnchorService.create(req.params.sessionId, messageId, label.trim());
    res.status(201).json(anchor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/sessions/:sessionId/anchors/:anchorId - Delete an anchor
router.delete('/:sessionId/anchors/:anchorId', (req, res) => {
  try {
    const anchor = AnchorService.getById(req.params.anchorId);
    if (!anchor) {
      return res.status(404).json({ error: 'Anchor not found' });
    }

    if (anchor.session_id !== req.params.sessionId) {
      return res.status(403).json({ error: 'Anchor does not belong to this session' });
    }

    AnchorService.delete(req.params.anchorId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
