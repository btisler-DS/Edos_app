import { getDb } from '../db/connection.js';
import { EmbeddingStore } from './EmbeddingStore.js';
import { EmbeddingService } from './EmbeddingService.js';
import { cosineSimilarity } from '../utils/similarity.js';
import { getProviderFromEnv } from '../providers/index.js';
import { UTILITY_MODELS } from '../config/constants.js';

/**
 * Cross-session synthesis service
 * Synthesizes answers by pulling from multiple relevant sessions
 */
export class SynthesisService {
  /**
   * Synthesize an answer from multiple sessions
   * @param {string} query - The question to answer
   * @param {object} options - Synthesis options
   * @param {string[]} options.sessionIds - Optional specific sessions to include
   * @param {string} options.projectId - Optional project filter
   * @param {number} options.maxSessions - Max sessions to consider (default: 5)
   * @param {number} options.threshold - Similarity threshold (default: 0.3)
   * @param {string} options.provider - LLM provider to use (default: from active profile)
   * @returns {Promise<object>} Synthesis result with answer and sources
   */
  static async synthesize(query, options = {}) {
    const {
      sessionIds = null,
      projectId = null,
      maxSessions = 5,
      threshold = 0.3,
      provider = null,
    } = options;

    const db = getDb();

    // Step 1: Find relevant sessions
    let relevantSessions = [];

    if (sessionIds && sessionIds.length > 0) {
      // Use specified sessions
      relevantSessions = sessionIds.map(id => {
        const session = db.prepare(
          'SELECT id, title, created_at FROM sessions WHERE id = ?'
        ).get(id);
        return session ? { ...session, score: 1.0 } : null;
      }).filter(Boolean);
    } else {
      // Search by semantic similarity
      const queryEmbedding = await EmbeddingService.embed(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate embedding for query');
      }

      // Get all session embeddings
      const allEmbeddings = EmbeddingStore.getAllByType('session_summary');

      // Calculate similarities
      const similarities = [];
      for (const embedding of allEmbeddings) {
        const score = cosineSimilarity(queryEmbedding.vector, embedding.vector);
        if (score >= threshold) {
          similarities.push({
            sessionId: embedding.source_id,
            score,
          });
        }
      }

      // Sort and limit
      similarities.sort((a, b) => b.score - a.score);
      const topSessions = similarities.slice(0, maxSessions);

      // Enrich with session data
      for (const result of topSessions) {
        let sessionQuery = 'SELECT id, title, project_id, created_at FROM sessions WHERE id = ?';
        const session = db.prepare(sessionQuery).get(result.sessionId);

        if (session) {
          // Apply project filter if specified
          if (projectId && session.project_id !== projectId) {
            continue;
          }

          relevantSessions.push({
            ...session,
            score: result.score,
          });
        }
      }
    }

    if (relevantSessions.length === 0) {
      return {
        answer: 'I could not find any relevant sessions to synthesize an answer from.',
        sources: [],
        query,
      };
    }

    // Step 2: Gather content from relevant sessions
    const sessionContents = [];
    for (const session of relevantSessions) {
      // Get metadata
      const metadata = db.prepare(
        'SELECT orientation_blurb, unresolved_edge FROM session_metadata WHERE session_id = ?'
      ).get(session.id);

      // Get key messages (user messages and short assistant responses)
      const messages = db.prepare(`
        SELECT role, content
        FROM messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT 20
      `).all(session.id);

      // Extract key points from messages
      const keyPoints = messages
        .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content.length < 500))
        .map(m => `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.substring(0, 300)}`)
        .join('\n');

      sessionContents.push({
        id: session.id,
        title: session.title || 'Untitled',
        score: session.score,
        orientation: metadata?.orientation_blurb || '',
        unresolved: metadata?.unresolved_edge || '',
        keyPoints: keyPoints.substring(0, 2000),
        createdAt: session.created_at,
      });
    }

    // Step 3: Generate synthesis using LLM
    const synthesisPrompt = buildSynthesisPrompt(query, sessionContents);

    // Determine which provider to use
    let llmProvider;
    let modelId;

    try {
      // Try to use the specified or default provider
      const providerName = provider || 'anthropic';
      llmProvider = getProviderFromEnv(providerName);
      modelId = UTILITY_MODELS[providerName];
    } catch (error) {
      // Fallback to any available provider
      try {
        llmProvider = getProviderFromEnv('openai');
        modelId = UTILITY_MODELS.openai;
      } catch {
        try {
          llmProvider = getProviderFromEnv('ollama');
          modelId = UTILITY_MODELS.ollama;
        } catch {
          throw new Error('No LLM provider available for synthesis');
        }
      }
    }

    // Generate the synthesis
    const answer = await llmProvider.generateSynthesis(synthesisPrompt, modelId);

    return {
      answer,
      sources: sessionContents.map(s => ({
        id: s.id,
        title: s.title,
        score: Math.round(s.score * 100) / 100,
        orientation: s.orientation,
        hasUnresolved: !!s.unresolved,
      })),
      query,
      sessionsAnalyzed: sessionContents.length,
    };
  }
}

/**
 * Build the synthesis prompt from session contents
 */
function buildSynthesisPrompt(query, sessions) {
  const sessionSummaries = sessions.map((s, i) => `
### Session ${i + 1}: "${s.title}" (Relevance: ${Math.round(s.score * 100)}%)
${s.orientation ? `**Context:** ${s.orientation}` : ''}
${s.unresolved ? `**Open question:** ${s.unresolved}` : ''}

**Key exchanges:**
${s.keyPoints || 'No key points available.'}
`).join('\n---\n');

  return `You are synthesizing knowledge from the user's past thinking sessions to answer their question.

## User's Question
${query}

## Relevant Past Sessions
${sessionSummaries}

## Instructions
Based on the sessions above, provide a comprehensive answer that:
1. Directly addresses the user's question
2. Draws on insights from multiple sessions where relevant
3. Notes any contradictions or evolution in thinking across sessions
4. Highlights any unresolved questions that remain open
5. References specific sessions when making claims (e.g., "In your session about X...")

Be concise but thorough. Speak directly to the user about their own thinking.`;
}
