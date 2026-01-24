import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { MessageService } from '../services/MessageService.js';
import { MetadataService } from '../services/MetadataService.js';
import { ContextService } from '../services/ContextService.js';
import { getProviderFromEnv } from '../providers/index.js';

const router = Router();

// POST /api/sessions/:sessionId/messages - Send a message and get streaming response
router.post('/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    // Validate session exists
    const session = SessionService.getById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get model profile for this session
    const modelProfile = SessionService.getModelProfile(sessionId);
    if (!modelProfile) {
      return res.status(500).json({ error: 'Model profile not found for session' });
    }

    // Get session context (uploaded files, assembled sessions) and enhance system prompt
    const sessionContext = ContextService.getFormattedContext(sessionId);
    const effectiveProfile = { ...modelProfile };
    if (sessionContext) {
      const basePrompt = modelProfile.system_prompt || '';
      effectiveProfile.system_prompt = `${basePrompt}\n\nThe user has provided the following reference material for this inquiry:\n\n${sessionContext}\n\nUse this material to inform your responses when relevant.`;
    }

    // Add user message
    MessageService.addUserMessage(sessionId, content);

    // Touch session to update last_active_at
    SessionService.touch(sessionId);

    // Get context messages (with truncation handling)
    const { messages: contextMessages, truncated } = MessageService.getContextMessages(sessionId);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send truncation warning if needed
    if (truncated) {
      res.write(`event: warning\ndata: ${JSON.stringify({ type: 'context_truncated' })}\n\n`);
    }

    // Get provider and stream response
    const provider = getProviderFromEnv(effectiveProfile.provider);
    let fullResponse = '';

    try {
      for await (const chunk of provider.sendMessageStream(contextMessages, effectiveProfile)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // Save the complete assistant message
      MessageService.addAssistantMessage(sessionId, fullResponse);

      // Touch session again after response
      SessionService.touch(sessionId);

      // Check if this is the first assistant response (for title generation)
      const messageCount = MessageService.getCount(sessionId);
      if (messageCount === 2 && !session.title) {
        // Generate title asynchronously (don't block the response)
        MetadataService.generateTitleForSession(sessionId)
          .then(title => console.log(`Generated title for ${sessionId}: ${title}`))
          .catch(err => console.error(`Title generation failed for ${sessionId}:`, err.message));
      }

      // Send done event
      res.write(`event: done\ndata: ${JSON.stringify({ messageId: 'complete' })}\n\n`);
      res.end();
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Message error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
