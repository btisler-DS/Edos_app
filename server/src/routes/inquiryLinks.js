import { Router } from 'express';
import { InquiryLinkService } from '../services/InquiryLinkService.js';
import { SessionService } from '../services/SessionService.js';

const router = Router();

/**
 * POST /api/inquiry-links
 * Create a link between two inquiries
 */
router.post('/', (req, res) => {
  try {
    const { fromSessionId, toSessionId, note } = req.body;

    if (!fromSessionId || !toSessionId) {
      return res.status(400).json({ error: 'fromSessionId and toSessionId are required' });
    }

    // Verify both sessions exist
    const fromSession = SessionService.getById(fromSessionId);
    if (!fromSession) {
      return res.status(404).json({ error: 'Source session not found' });
    }

    const toSession = SessionService.getById(toSessionId);
    if (!toSession) {
      return res.status(404).json({ error: 'Destination session not found' });
    }

    const link = InquiryLinkService.create(fromSessionId, toSessionId, note || null);
    res.status(201).json(link);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Link already exists between these sessions' });
    }
    if (error.message.includes('circular') || error.message.includes('itself')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inquiry-links/:sessionId
 * Get all links for a session (incoming and outgoing)
 */
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = SessionService.getById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const links = InquiryLinkService.getBySessionId(sessionId);
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/inquiry-links/:sessionId/chain
 * Get the full ancestor chain for a session
 */
router.get('/:sessionId/chain', (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = SessionService.getById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const chain = InquiryLinkService.getAncestorChain(sessionId);
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/inquiry-links/:linkId
 * Delete a link
 */
router.delete('/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;

    const link = InquiryLinkService.getById(linkId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    InquiryLinkService.delete(linkId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
