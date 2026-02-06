import { Router } from 'express';
import { SynthesisService } from '../services/SynthesisService.js';

const router = Router();

/**
 * POST /api/synthesize
 * Generate a synthesized answer from multiple sessions
 *
 * Body:
 * - query: string (required) - The question to answer
 * - sessionIds: string[] (optional) - Specific sessions to include
 * - projectId: string (optional) - Filter to a specific project
 * - maxSessions: number (optional) - Max sessions to consider (default: 5)
 * - threshold: number (optional) - Similarity threshold 0-1 (default: 0.3)
 * - provider: string (optional) - LLM provider to use
 */
router.post('/', async (req, res) => {
  try {
    const { query, sessionIds, projectId, maxSessions, threshold, provider } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length < 5) {
      return res.status(400).json({ error: 'Query is required and must be at least 5 characters' });
    }

    const result = await SynthesisService.synthesize(query.trim(), {
      sessionIds,
      projectId,
      maxSessions,
      threshold,
      provider,
    });

    res.json(result);
  } catch (error) {
    console.error('[Synthesis] Error:', error);
    res.status(500).json({ error: error.message || 'Synthesis failed' });
  }
});

/**
 * GET /api/synthesize/test
 * Quick test endpoint to verify synthesis is working
 */
router.get('/test', async (req, res) => {
  res.json({
    status: 'ok',
    message: 'Synthesis endpoint is available',
    usage: 'POST /api/synthesize with { query: "your question" }',
  });
});

export default router;
