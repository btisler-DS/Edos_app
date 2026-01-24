import { Router } from 'express';
import { SimilarityService } from '../services/SimilarityService.js';

const router = Router();

/**
 * GET /api/similarity/sessions/:sessionId
 * Find sessions similar to the given session
 */
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5;

    const results = SimilarityService.findSimilarSessions(sessionId, limit);

    res.json(results);
  } catch (error) {
    console.error('[Similarity] sessions error:', error);
    res.status(500).json({ error: error.message || 'Failed to find similar sessions' });
  }
});

/**
 * GET /api/similarity/documents/:sessionId
 * Find documents similar to the given session
 */
router.get('/documents/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 5;

    const results = SimilarityService.findSimilarDocuments(sessionId, limit);

    res.json(results);
  } catch (error) {
    console.error('[Similarity] documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to find similar documents' });
  }
});

export default router;
