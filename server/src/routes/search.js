import { Router } from 'express';
import { SearchService } from '../services/SearchService.js';

const router = Router();

/**
 * GET /api/search/keyword
 * Keyword search across sessions and messages
 * Accepts ?projectId= to scope by project
 */
router.get('/keyword', (req, res) => {
  try {
    const { q, limit, include_assistant, imported_only, projectId } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = SearchService.searchKeyword(q, {
      limit: limit ? parseInt(limit, 10) : 25,
      includeAssistant: include_assistant === 'true',
      importedOnly: imported_only === 'true',
      projectId: projectId || null,
    });

    res.json(results);
  } catch (error) {
    console.error('[Search] keyword error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

/**
 * GET /api/search/by-date
 * Search sessions by date range
 * Accepts ?projectId= to scope by project
 */
router.get('/by-date', (req, res) => {
  try {
    const { start_date, end_date, imported_only, limit, projectId } = req.query;

    const results = SearchService.searchByDate({
      startDate: start_date || null,
      endDate: end_date || null,
      importedOnly: imported_only === 'true',
      projectId: projectId || null,
      limit: limit ? parseInt(limit, 10) : 25,
    });

    res.json(results);
  } catch (error) {
    console.error('[Search] by-date error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

/**
 * GET /api/search/concept
 * Concept search using semantic similarity
 * Accepts ?projectId= to scope by project
 */
router.get('/concept', async (req, res) => {
  try {
    const { q, limit, projectId } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await SearchService.searchConcept(q, {
      limit: limit ? parseInt(limit, 10) : 25,
      projectId: projectId || null,
    });

    res.json(results);
  } catch (error) {
    console.error('[Search] concept error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

export default router;
