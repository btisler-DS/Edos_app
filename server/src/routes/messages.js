import { Router } from 'express';
import { SessionService } from '../services/SessionService.js';
import { MessageService } from '../services/MessageService.js';
import { MetadataService } from '../services/MetadataService.js';
import { ContextService } from '../services/ContextService.js';
import { getProviderFromEnv } from '../providers/index.js';
import { parseSearchCommand } from '../utils/searchParser.js';
import { WebSearchService } from '../services/WebSearchService.js';
import { extractUrls } from '../utils/urlParser.js';
import { UrlFetchService } from '../services/UrlFetchService.js';
import { validateRequest, sanitizeString, schemas } from '../utils/validate.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

// POST /api/sessions/:sessionId/messages - Send a message and get streaming response
router.post('/:sessionId/messages', validateRequest(schemas.sendMessage), async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;

  // Sanitize content (limit size, remove null bytes)
  const sanitizedContent = sanitizeString(content, { maxLength: 100000 });

  try {
    // Validate session exists
    const session = SessionService.getById(sessionId);
    if (!session) {
      throw new NotFoundError('Session', sessionId);
    }

    // Get model profile for this session
    const modelProfile = SessionService.getModelProfile(sessionId);
    if (!modelProfile) {
      throw new NotFoundError('Model profile');
    }

    // Parse for search command
    const searchParsed = parseSearchCommand(sanitizedContent);
    const webSearchEnabled = WebSearchService.isEnabled();

    // Set up SSE early if search is detected (need to stream search events)
    let sseInitialized = false;
    const initSSE = () => {
      if (!sseInitialized) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        sseInitialized = true;
      }
    };

    // Handle web search if command detected
    if (searchParsed.hasSearch) {
      if (!webSearchEnabled) {
        // Search disabled - send warning and continue with original content
        initSSE();
        res.write(`event: search_disabled\ndata: ${JSON.stringify({ query: searchParsed.query, message: 'Web search is not enabled' })}\n\n`);
      } else {
        try {
          initSSE();
          res.write(`event: search_start\ndata: ${JSON.stringify({ query: searchParsed.query })}\n\n`);

          const results = await WebSearchService.search(searchParsed.query);

          if (results.length > 0) {
            // Format and store search results as context
            const formattedContent = WebSearchService.formatForContext(results, searchParsed.query);
            ContextService.addWebSearchContext(sessionId, searchParsed.query, results, formattedContent);
          }

          res.write(`event: search_complete\ndata: ${JSON.stringify({ count: results.length, query: searchParsed.query })}\n\n`);
        } catch (searchError) {
          console.error('Web search error:', searchError);
          res.write(`event: search_error\ndata: ${JSON.stringify({ error: searchError.message, query: searchParsed.query })}\n\n`);
        }
      }
    }

    // Use cleaned content (with search command stripped) for storage
    const messageContent = searchParsed.hasSearch ? searchParsed.cleanedContent : sanitizedContent;

    // Detect and fetch URLs in the message
    const urls = extractUrls(messageContent);
    if (urls.length > 0) {
      initSSE();
      res.write(`event: url_fetch_start\ndata: ${JSON.stringify({ urls, count: urls.length })}\n\n`);

      // Fetch URLs (limit to 3 to avoid overwhelming context)
      const urlsToFetch = urls.slice(0, 3);
      const fetchResults = await UrlFetchService.fetchMultiple(urlsToFetch);

      let successCount = 0;
      for (const result of fetchResults) {
        if (result.success) {
          const formattedContent = UrlFetchService.formatForContext(result);
          ContextService.addUrlFetchContext(sessionId, result.url, result.title, formattedContent);
          successCount++;
        } else {
          console.log(`[UrlFetch] Failed to fetch ${result.url}: ${result.error}`);
        }
      }

      res.write(`event: url_fetch_complete\ndata: ${JSON.stringify({ fetched: successCount, total: urlsToFetch.length })}\n\n`);
    }

    // Get session context (uploaded files, assembled sessions, web search, fetched URLs) and enhance system prompt
    const sessionContext = ContextService.getFormattedContext(sessionId);
    const effectiveProfile = { ...modelProfile };
    if (sessionContext) {
      const basePrompt = modelProfile.system_prompt || '';
      effectiveProfile.system_prompt = `${basePrompt}\n\nThe user has provided the following reference material for this inquiry:\n\n${sessionContext}\n\nUse this material to inform your responses when relevant.`;
    }

    // Add user message (with command stripped if search was performed)
    MessageService.addUserMessage(sessionId, messageContent || sanitizedContent);

    // Touch session to update last_active_at
    SessionService.touch(sessionId);

    // Get context messages (with truncation handling)
    const { messages: contextMessages, truncated } = MessageService.getContextMessages(sessionId);

    // Set up SSE (if not already initialized by search)
    initSSE();

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
