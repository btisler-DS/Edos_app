import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { MessageService } from '../services/MessageService.js';
import { PdfExportService } from '../services/PdfExportService.js';
import { ContextService } from '../services/ContextService.js';
import { validateRequest, schemas, sanitizeString } from '../utils/validate.js';
import { NotFoundError, asyncHandler } from '../utils/errors.js';

const router = Router();

// GET /api/sessions - List all sessions (with optional filters)
router.get('/', (req, res) => {
  try {
    const { project, hasDocuments, archived } = req.query;

    let sessions;
    if (hasDocuments === 'true') {
      sessions = SessionService.getWithDocuments();
    } else if (project !== undefined) {
      // project can be a project_id or 'unassigned' (null)
      sessions = SessionService.getByProject(project === 'unassigned' ? null : project);
    } else {
      sessions = SessionService.getAll({ archived: archived === 'true' });
    }

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const session = SessionService.getById(req.params.id);
  if (!session) {
    throw NotFoundError.session(req.params.id);
  }
  res.json(session);
}));

// POST /api/sessions - Create new session (New Inquiry)
router.post('/', (req, res) => {
  try {
    const { contextFromSessions, continuedFromSessionId } = req.body || {};
    const session = SessionService.create(contextFromSessions, continuedFromSessionId);
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

// PUT /api/sessions/:id - Update session (project, title, pinned, archived)
router.put('/:id', validateRequest(schemas.updateSession), asyncHandler(async (req, res) => {
  const session = SessionService.getById(req.params.id);
  if (!session) {
    throw NotFoundError.session(req.params.id);
  }

  const { project_id, title, pinned, archived } = req.body;

  if (project_id !== undefined) {
    SessionService.setProject(req.params.id, project_id || null);
  }

  // Handle title, pinned, archived via updateFields
  const controlFields = {};
  if (title !== undefined) controlFields.title = sanitizeString(title, { maxLength: 200 });
  if (pinned !== undefined) controlFields.pinned = pinned;
  if (archived !== undefined) controlFields.archived = archived;

  if (Object.keys(controlFields).length > 0) {
    SessionService.updateFields(req.params.id, controlFields);
  }

  const updated = SessionService.getById(req.params.id);
  res.json(updated);
}));

// DELETE /api/sessions/:id/context/:contextId - Remove a context item
router.delete('/:id/context/:contextId', asyncHandler(async (req, res) => {
  const session = SessionService.getById(req.params.id);
  if (!session) {
    throw NotFoundError.session(req.params.id);
  }

  const context = ContextService.getById(req.params.contextId);
  if (!context || context.session_id !== req.params.id) {
    throw NotFoundError.context(req.params.contextId);
  }

  ContextService.delete(req.params.contextId);
  res.status(204).send();
}));

// DELETE /api/sessions/:id/context - Remove all context from a session
router.delete('/:id/context', asyncHandler(async (req, res) => {
  const session = SessionService.getById(req.params.id);
  if (!session) {
    throw NotFoundError.session(req.params.id);
  }

  const removed = ContextService.deleteAllForSession(req.params.id);
  res.json({ removed });
}));

// DELETE /api/sessions/:id - Delete a session
router.delete('/:id', asyncHandler(async (req, res) => {
  const session = SessionService.getById(req.params.id);
  if (!session) {
    throw NotFoundError.session(req.params.id);
  }

  SessionService.delete(req.params.id);
  res.status(204).send();
}));

export default router;
