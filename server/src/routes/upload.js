import { Router } from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { SessionService } from '../services/SessionService.js';
import { ContextService } from '../services/ContextService.js';
import { MessageService } from '../services/MessageService.js';
import { ChunkService } from '../services/ChunkService.js';
import { EmbeddingService } from '../services/EmbeddingService.js';
import { EmbeddingStore } from '../services/EmbeddingStore.js';
import { chunkText } from '../utils/chunking.js';

// pdf-parse is CommonJS only, use createRequire
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = Router();

// Configure multer for memory storage (files stay in memory, not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'text/x-markdown',
    ];
    const allowedExtensions = ['.pdf', '.txt', '.md'];

    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and MD files are allowed'));
    }
  },
});

/**
 * Process document chunks and generate embeddings (non-blocking)
 * @param {string} contextId - ID of the session_context record
 * @param {string} sourceName - Original filename
 * @param {string} content - Full document content
 */
async function processDocumentChunks(contextId, sourceName, content) {
  // Chunk the text
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    return;
  }

  // Store chunks in database
  const storedChunks = ChunkService.storeChunks(contextId, sourceName, chunks);

  // Embed each chunk
  for (const chunk of storedChunks) {
    try {
      const embedding = await EmbeddingService.embed(chunk.content);
      if (embedding) {
        EmbeddingStore.store('document_chunk', chunk.id, embedding);
      }
    } catch (err) {
      console.error(`[Upload] Chunk embedding failed for ${chunk.id}:`, err.message);
      // Continue with other chunks
    }
  }

  console.log(`[Upload] Processed ${storedChunks.length} chunks for ${sourceName}`);
}

/**
 * Extract text content from uploaded file
 */
async function extractContent(file) {
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

  if (ext === '.pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }

  // TXT and MD files - just decode the buffer
  return file.buffer.toString('utf-8');
}

/**
 * POST /api/upload
 * Upload a file and add it as context to an inquiry session
 * - If sessionId is provided, adds to existing session
 * - If no sessionId, creates a new session
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text content from file
    const content = await extractContent(req.file);

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from file' });
    }

    const { sessionId } = req.body;
    let session;
    let isNewSession = false;

    if (sessionId) {
      // Add to existing session
      session = SessionService.getById(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      // Create a new session
      session = SessionService.create();
      isNewSession = true;

      // Set initial title based on filename (only for new sessions)
      const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
      SessionService.setTitle(session.id, baseName);
    }

    // Add file content as session context
    const contextRecord = ContextService.addFileContext(session.id, req.file.originalname, content.trim());

    // Non-blocking chunking and embedding
    processDocumentChunks(contextRecord.id, req.file.originalname, content.trim()).catch(err => {
      console.error('[Upload] Chunk/embedding failed:', err.message);
    });

    // Insert a timeline message indicating document was added
    MessageService.addSystemMessage(
      session.id,
      `Document added: ${req.file.originalname}\n(Text extracted and available for inquiry)`
    );

    // Touch the session to update last_active_at
    SessionService.touch(session.id);

    // Get updated session
    const updatedSession = SessionService.getById(session.id);

    res.status(201).json({
      session: updatedSession,
      isNewSession,
      context: {
        filename: req.file.originalname,
        contentLength: content.length,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
