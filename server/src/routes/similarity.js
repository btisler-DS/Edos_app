import { Router } from 'express';
import { SimilarityService } from '../services/SimilarityService.js';

const router = Router();

/**
 * POST /api/similarity/search
 * Search for sessions similar to a query text
 * Used for context surfacing during composition
 */
router.post('/search', async (req, res) => {
  try {
    const { query, excludeSessionId, limit = 3, threshold = 0.35 } = req.body;

    if (!query || query.trim().length < 10) {
      return res.json({ results: [], message: 'Query too short' });
    }

    const results = await SimilarityService.searchByQuery(
      query,
      excludeSessionId,
      parseInt(limit, 10),
      parseFloat(threshold)
    );

    res.json({ results });
  } catch (error) {
    console.error('[Similarity] search error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

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
