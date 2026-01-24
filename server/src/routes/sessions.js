import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { MessageService } from '../services/MessageService.js';
import { PdfExportService } from '../services/PdfExportService.js';

const router = Router();

// GET /api/sessions - List all sessions (with optional filters)
router.get('/', (req, res) => {
  try {
    const { project, hasDocuments } = req.query;

    let sessions;
    if (hasDocuments === 'true') {
      sessions = SessionService.getWithDocuments();
    } else if (project !== undefined) {
      // project can be a project_id or 'unassigned' (null)
      sessions = SessionService.getByProject(project === 'unassigned' ? null : project);
    } else {
      sessions = SessionService.getAll();
    }

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
    const { contextFromSessions } = req.body || {};
    const session = SessionService.create(contextFromSessions);
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

// GET /api/sessions/:id/export/pdf - Export session as PDF
router.get('/:id/export/pdf', async (req, res) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = MessageService.getBySessionId(req.params.id);

    const pdf = await PdfExportService.generatePdf(session, messages);
    const filename = PdfExportService.generateFilename(session);

    // Ensure pdf is a proper Buffer
    const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// PUT /api/sessions/:id - Update session (e.g., project assignment)
router.put('/:id', (req, res) => {
  try {
    const session = SessionService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { project_id } = req.body;

    if (project_id !== undefined) {
      SessionService.setProject(req.params.id, project_id || null);
    }

    const updated = SessionService.getById(req.params.id);
    res.json(updated);
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
