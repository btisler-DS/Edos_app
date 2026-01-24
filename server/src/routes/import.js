import { Router } from 'express';
import multer from 'multer';
import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { ModelProfileService } from '../services/ModelProfileService.js';

const router = Router();

// Configure multer for large JSON files (up to 500MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'));
    }
  },
});

/**
 * Convert Unix timestamp to ISO string
 */
function unixToIso(timestamp) {
  if (!timestamp) return new Date().toISOString();
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Extract messages from OpenAI conversation mapping (tree traversal)
 */
function extractMessages(mapping) {
  const messages = [];
  const visited = new Set();

  // Find root node
  let rootId = null;
  for (const [id, node] of Object.entries(mapping)) {
    if (!node.parent || node.parent === 'client-created-root') {
      if (id === 'client-created-root') {
        rootId = node.children?.[0] || null;
      } else if (!rootId) {
        rootId = id;
      }
    }
  }

  if (!rootId) return messages;

  // BFS traversal following children
  const queue = [rootId];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) continue;

    const msg = node.message;
    if (msg && msg.author?.role) {
      const role = msg.author.role;

      // Skip system messages (hard rule)
      if (role === 'user' || role === 'assistant') {
        let content = '';

        if (msg.content?.parts && Array.isArray(msg.content.parts)) {
          content = msg.content.parts
            .filter(p => typeof p === 'string')
            .join('\n')
            .trim();
        } else if (msg.content?.content_type === 'text' && msg.content?.text) {
          content = msg.content.text.trim();
        }

        if (content) {
          messages.push({
            role,
            content,
            created_at: msg.create_time ? unixToIso(msg.create_time) : null,
          });
        }
      }
    }

    if (node.children && Array.isArray(node.children)) {
      queue.push(...node.children);
    }
  }

  return messages;
}

/**
 * Derive title from conversation
 */
function deriveTitle(conversation, messages) {
  if (conversation.title &&
      conversation.title !== 'New chat' &&
      conversation.title !== 'Untitled' &&
      conversation.title.trim()) {
    return conversation.title.slice(0, 100);
  }

  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const truncated = firstUserMsg.content.slice(0, 80);
    return truncated.length < firstUserMsg.content.length
      ? truncated + '...'
      : truncated;
  }

  return 'Imported Inquiry';
}

/**
 * POST /api/import/openai
 * Import OpenAI conversations.json backup
 */
router.post('/openai', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse JSON
    let conversations;
    try {
      const raw = req.file.buffer.toString('utf-8');
      conversations = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    if (!Array.isArray(conversations)) {
      return res.status(400).json({ error: 'Expected array of conversations' });
    }

    // Get active model profile
    const activeProfile = ModelProfileService.getActive();
    if (!activeProfile) {
      return res.status(400).json({ error: 'No active model profile. Please set one first.' });
    }

    const db = getDb();

    // Statistics
    let imported = 0;
    let skipped = 0;
    let totalMessages = 0;

    // Process each conversation
    for (const conv of conversations) {
      const messages = extractMessages(conv.mapping || {});

      if (messages.length === 0) {
        skipped++;
        continue;
      }

      const title = deriveTitle(conv, messages);
      const createdAt = unixToIso(conv.create_time);
      const updatedAt = unixToIso(conv.update_time || conv.create_time);

      // Create session with imported=1
      const sessionId = generatePrefixedId('ses');

      db.prepare(`
        INSERT INTO sessions (id, title, model_profile_id, user_id, created_at, updated_at, last_active_at, imported)
        VALUES (?, ?, ?, 'default', ?, ?, ?, 1)
      `).run(sessionId, title, activeProfile.id, createdAt, updatedAt, updatedAt);

      // Insert messages
      const insertMsg = db.prepare(`
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const msg of messages) {
        const msgId = generatePrefixedId('msg');
        const msgTime = msg.created_at || createdAt;
        insertMsg.run(msgId, sessionId, msg.role, msg.content, msgTime);
      }

      imported++;
      totalMessages += messages.length;
    }

    res.json({
      success: true,
      imported,
      skipped,
      totalMessages,
      message: `Imported ${imported} conversations with ${totalMessages} messages. Skipped ${skipped} empty conversations.`,
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

export default router;
