import { Router } from 'express';
import multer from 'multer';
import { getDb } from '../db/connection.js';
import { generatePrefixedId } from '../utils/ids.js';
import { ModelProfileService } from '../services/ModelProfileService.js';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

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

/**
 * Extract messages from Claude.ai conversation
 * Claude exports have chat_messages array with sender: "human" | "assistant"
 */
function extractClaudeMessages(conversation) {
  const messages = [];

  // Handle chat_messages array
  const chatMessages = conversation.chat_messages || conversation.messages || [];

  for (const msg of chatMessages) {
    // Map Claude's sender to standard role
    let role = null;
    if (msg.sender === 'human' || msg.role === 'user') {
      role = 'user';
    } else if (msg.sender === 'assistant' || msg.role === 'assistant') {
      role = 'assistant';
    }

    if (!role) continue;

    // Extract content - could be text, content, or message field
    let content = msg.text || msg.content || msg.message || '';

    // Handle content array (some Claude exports have this)
    if (Array.isArray(content)) {
      content = content
        .filter(c => typeof c === 'string' || c.type === 'text')
        .map(c => typeof c === 'string' ? c : c.text)
        .join('\n');
    }

    content = String(content).trim();

    if (content) {
      messages.push({
        role,
        content,
        created_at: msg.created_at || msg.timestamp || null,
      });
    }
  }

  return messages;
}

/**
 * Derive title from Claude conversation
 */
function deriveClaudeTitle(conversation, messages) {
  // Check various title fields
  const title = conversation.name || conversation.title || conversation.conversation_name;

  if (title &&
      title !== 'New chat' &&
      title !== 'Untitled' &&
      title !== 'New conversation' &&
      title.trim()) {
    return title.slice(0, 100);
  }

  // Fall back to first user message
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const truncated = firstUserMsg.content.slice(0, 80);
    return truncated.length < firstUserMsg.content.length
      ? truncated + '...'
      : truncated;
  }

  return 'Imported Claude Inquiry';
}

/**
 * POST /api/import/claude
 * Import Claude.ai conversation exports
 * Supports both single conversation and array of conversations
 */
router.post('/claude', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse JSON
    let data;
    try {
      const raw = req.file.buffer.toString('utf-8');
      data = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON file' });
    }

    // Normalize to array
    const conversations = Array.isArray(data) ? data : [data];

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
      const messages = extractClaudeMessages(conv);

      if (messages.length === 0) {
        skipped++;
        continue;
      }

      const title = deriveClaudeTitle(conv, messages);
      const createdAt = conv.created_at || new Date().toISOString();
      const updatedAt = conv.updated_at || conv.created_at || new Date().toISOString();

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
      message: `Imported ${imported} Claude conversations with ${totalMessages} messages. Skipped ${skipped} empty conversations.`,
    });

  } catch (error) {
    console.error('Claude import error:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

/**
 * Parse YAML frontmatter from markdown content
 */
function parseYamlFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { metadata: {}, body: content };
  }

  const yamlContent = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // Simple YAML parser (key: value pairs)
  const metadata = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[match[1]] = value;
    }
  }

  return { metadata, body };
}

/**
 * Parse markdown content into messages (Q&A format)
 * Looks for patterns like:
 * ### **You:** or ### You: or ## User: etc.
 * ### **Edos:** or ### Assistant: or ## AI: etc.
 */
function parseMarkdownToMessages(body) {
  const messages = [];

  // Split by message headers
  const messagePattern = /###?\s*\*?\*?(You|User|Human|Edos|Assistant|AI|Claude|GPT)\*?\*?:?\s*\*?\*?\n/gi;

  const parts = body.split(messagePattern);

  // Parts alternates between: content before first header, header1, content1, header2, content2...
  let i = 1; // Skip content before first header
  while (i < parts.length) {
    const header = parts[i]?.toLowerCase() || '';
    const content = parts[i + 1]?.trim() || '';

    if (content) {
      // Remove timestamp line if present (usually italic: *timestamp*)
      const cleanContent = content
        .replace(/^\*[^*]+\*\n+/, '') // Remove italic timestamp
        .replace(/^---\n+$/, '') // Remove just separator
        .replace(/---\s*$/, '') // Remove trailing separator
        .trim();

      if (cleanContent) {
        const role = ['you', 'user', 'human'].includes(header) ? 'user' : 'assistant';
        messages.push({ role, content: cleanContent });
      }
    }

    i += 2;
  }

  // If no structured messages found, treat entire body as single user message
  if (messages.length === 0 && body.trim()) {
    messages.push({
      role: 'user',
      content: body.trim(),
    });
  }

  return messages;
}

/**
 * Configure multer for markdown/zip files
 */
const markdownUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/markdown',
      'text/x-markdown',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    const ext = file.originalname.toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith('.md') || ext.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only Markdown (.md) or ZIP files are allowed'));
    }
  },
});

/**
 * POST /api/import/markdown
 * Import markdown files as sessions
 * Supports single .md file or .zip archive of .md files
 */
router.post('/markdown', markdownUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get active model profile
    const activeProfile = ModelProfileService.getActive();
    if (!activeProfile) {
      return res.status(400).json({ error: 'No active model profile. Please set one first.' });
    }

    const db = getDb();
    let files = [];

    // Check if ZIP file
    if (req.file.originalname.toLowerCase().endsWith('.zip')) {
      // Process ZIP file
      try {
        const AdmZip = (await import('adm-zip')).default;
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        for (const entry of entries) {
          if (!entry.isDirectory && entry.entryName.endsWith('.md')) {
            const content = entry.getData().toString('utf-8');
            const filename = entry.entryName.split('/').pop();
            files.push({ filename, content });
          }
        }
      } catch (zipError) {
        console.error('ZIP processing error:', zipError);
        return res.status(400).json({ error: 'Failed to process ZIP file: ' + zipError.message });
      }
    } else {
      // Single markdown file
      const content = req.file.buffer.toString('utf-8');
      files.push({
        filename: req.file.originalname,
        content,
      });
    }

    // Statistics
    let imported = 0;
    let skipped = 0;
    let totalMessages = 0;

    // Process each markdown file
    for (const file of files) {
      const { metadata, body } = parseYamlFrontmatter(file.content);
      const messages = parseMarkdownToMessages(body);

      if (messages.length === 0) {
        skipped++;
        continue;
      }

      // Derive title from metadata or filename
      let title = metadata.title || metadata.name;
      if (!title) {
        // Remove date prefix and extension from filename
        title = file.filename
          .replace(/^\d{4}-\d{2}-\d{2}-?/, '')
          .replace(/\.md$/i, '')
          .replace(/-/g, ' ')
          .trim();
      }
      if (!title || title === 'untitled') {
        title = messages[0]?.content.slice(0, 80) || 'Imported Note';
      }

      // Extract dates from metadata
      const createdAt = metadata.created || metadata.date || new Date().toISOString();
      const updatedAt = metadata.lastActive || metadata.updated || createdAt;

      // Create session
      const sessionId = generatePrefixedId('ses');

      db.prepare(`
        INSERT INTO sessions (id, title, model_profile_id, user_id, created_at, updated_at, last_active_at, imported)
        VALUES (?, ?, ?, 'default', ?, ?, ?, 1)
      `).run(sessionId, title.slice(0, 200), activeProfile.id, createdAt, updatedAt, updatedAt);

      // Insert messages
      const insertMsg = db.prepare(`
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgId = generatePrefixedId('msg');
        // Stagger message times slightly
        const msgTime = new Date(new Date(createdAt).getTime() + i * 60000).toISOString();
        insertMsg.run(msgId, sessionId, msg.role, msg.content, msgTime);
      }

      // Add metadata if available
      if (metadata.orientation || metadata.unresolvedEdge || metadata.lastPivot) {
        try {
          db.prepare(`
            INSERT INTO session_metadata (session_id, orientation_blurb, unresolved_edge, last_pivot, regenerated_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
          `).run(
            sessionId,
            metadata.orientation || null,
            metadata.unresolvedEdge || null,
            metadata.lastPivot || null
          );
        } catch (metaError) {
          // Metadata insert is optional, don't fail import
          console.warn('Failed to insert metadata:', metaError);
        }
      }

      imported++;
      totalMessages += messages.length;
    }

    res.json({
      success: true,
      imported,
      skipped,
      totalMessages,
      filesProcessed: files.length,
      message: `Imported ${imported} notes with ${totalMessages} messages from ${files.length} file(s). Skipped ${skipped} empty files.`,
    });

  } catch (error) {
    console.error('Markdown import error:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

export default router;
