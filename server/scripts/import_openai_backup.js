#!/usr/bin/env node
/**
 * EDOS v2 - Phase 0: OpenAI Backup Import Script
 *
 * Imports historical conversations from OpenAI's conversations.json export
 * as archival inquiry artifacts. These are "books on a shelf" - discoverable
 * but silent until explicitly engaged.
 *
 * INCLUDE: User messages, assistant messages, timestamps, titles
 * EXCLUDE: System messages, custom instructions, model metadata, personality
 *
 * Usage:
 *   node server/scripts/import_openai_backup.js path/to/conversations.json
 *
 * Options:
 *   --dry-run    Show what would be imported without writing to database
 *   --verbose    Show detailed progress
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');
const inputPath = args.find(arg => !arg.startsWith('--'));

if (!inputPath) {
  console.error('Usage: node import_openai_backup.js <path/to/conversations.json> [--dry-run] [--verbose]');
  process.exit(1);
}

// Resolve paths
const absoluteInputPath = resolve(inputPath);
// Get script directory and navigate to server root for db
const scriptDir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const dbPath = resolve(scriptDir, '../edos.db');

console.log('='.repeat(60));
console.log('EDOS v2 - OpenAI Backup Import');
console.log('='.repeat(60));
console.log(`Input: ${absoluteInputPath}`);
console.log(`Database: ${dbPath}`);
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
console.log('='.repeat(60));

/**
 * Generate prefixed ID matching EDOS convention
 */
function generatePrefixedId(prefix) {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Convert Unix timestamp to ISO string
 */
function unixToIso(timestamp) {
  if (!timestamp) return new Date().toISOString();
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Extract messages from OpenAI conversation mapping (tree traversal)
 * Returns messages in order, excluding system messages
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

    // Extract message if it exists and is user or assistant
    const msg = node.message;
    if (msg && msg.author?.role) {
      const role = msg.author.role;

      // Skip system messages (hard rule)
      if (role === 'system') {
        // Continue to children but don't extract
      } else if (role === 'user' || role === 'assistant') {
        // Extract content
        let content = '';

        if (msg.content?.parts && Array.isArray(msg.content.parts)) {
          content = msg.content.parts
            .filter(p => typeof p === 'string')
            .join('\n')
            .trim();
        } else if (msg.content?.content_type === 'text' && msg.content?.text) {
          content = msg.content.text.trim();
        }

        // Skip empty messages
        if (content) {
          messages.push({
            role,
            content,
            created_at: msg.create_time ? unixToIso(msg.create_time) : null,
          });
        }
      }
    }

    // Add children to queue
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
  // Use original title if non-generic
  if (conversation.title &&
      conversation.title !== 'New chat' &&
      conversation.title !== 'Untitled' &&
      conversation.title.trim()) {
    return conversation.title.slice(0, 100);
  }

  // Derive from first user message
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const truncated = firstUserMsg.content.slice(0, 80);
    return truncated.length < firstUserMsg.content.length
      ? truncated + '...'
      : truncated;
  }

  return 'Imported Inquiry';
}

// Main import logic
async function runImport() {
  console.log('\nReading conversations file...');

  let conversations;
  try {
    const raw = readFileSync(absoluteInputPath, 'utf-8');
    conversations = JSON.parse(raw);
    console.log(`Loaded ${conversations.length} conversations`);
  } catch (error) {
    console.error(`Failed to read/parse file: ${error.message}`);
    process.exit(1);
  }

  // Open database
  let db;
  if (!dryRun) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }

  // Get default model profile
  let modelProfileId = null;
  if (!dryRun) {
    const activeProfile = db.prepare('SELECT id FROM model_profiles WHERE is_active = 1').get();
    if (!activeProfile) {
      console.error('No active model profile found. Please set one first.');
      process.exit(1);
    }
    modelProfileId = activeProfile.id;
  }

  // Statistics
  let imported = 0;
  let skipped = 0;
  let totalMessages = 0;

  console.log('\nProcessing conversations...\n');

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];

    // Extract messages
    const messages = extractMessages(conv.mapping || {});

    // Skip empty conversations
    if (messages.length === 0) {
      skipped++;
      if (verbose) {
        console.log(`  [SKIP] Empty: ${conv.title || '(untitled)'}`);
      }
      continue;
    }

    const title = deriveTitle(conv, messages);
    const createdAt = unixToIso(conv.create_time);
    const updatedAt = unixToIso(conv.update_time || conv.create_time);

    if (verbose || (i % 50 === 0)) {
      console.log(`  [${i + 1}/${conversations.length}] ${title.slice(0, 50)}... (${messages.length} msgs)`);
    }

    if (!dryRun) {
      // Create session with imported=1
      const sessionId = generatePrefixedId('ses');

      db.prepare(`
        INSERT INTO sessions (id, title, model_profile_id, user_id, created_at, updated_at, last_active_at, imported)
        VALUES (?, ?, ?, 'default', ?, ?, ?, 1)
      `).run(sessionId, title, modelProfileId, createdAt, updatedAt, updatedAt);

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
    }

    imported++;
    totalMessages += messages.length;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`Conversations imported: ${imported}`);
  console.log(`Conversations skipped (empty): ${skipped}`);
  console.log(`Total messages imported: ${totalMessages}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes were made to the database.');
  } else {
    db.close();
    console.log('\nDatabase updated successfully.');
    console.log('Imported sessions have imported=1 flag and will not trigger automatic metadata generation.');
  }
}

runImport().catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});
