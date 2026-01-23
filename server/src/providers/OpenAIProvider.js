import OpenAI from 'openai';
import { LLMProvider } from './LLMProvider.js';
import { UTILITY_MODELS } from '../config/constants.js';

const METADATA_PROMPT = `Analyze this conversation and provide exactly three pieces of information in JSON format:

1. "orientation_blurb": A 2-3 sentence summary of what this inquiry is about. Write it as if reminding someone who was deeply engaged but stepped away.

2. "unresolved_edge": What question or tension remains open? What wasn't fully resolved or concluded? If the conversation feels complete, say "None apparent."

3. "last_pivot": Where did the conversation's direction or focus last change significantly? Describe the shift briefly.

Respond ONLY with valid JSON in this exact format:
{"orientation_blurb": "...", "unresolved_edge": "...", "last_pivot": "..."}`;

const TITLE_PROMPT = `Based on this conversation opening, generate a concise, descriptive title (3-7 words) that captures the essence of the inquiry. The title should help someone recognize what this conversation was about when they see it in a list.

Respond with ONLY the title text, no quotes or punctuation unless part of the title.`;

export class OpenAIProvider extends LLMProvider {
  constructor(apiKey) {
    super(apiKey);
    this.client = new OpenAI({ apiKey });
  }

  static get UTILITY_MODEL() {
    return UTILITY_MODELS.openai;
  }

  async *sendMessageStream(messages, modelProfile) {
    const params = JSON.parse(modelProfile.parameters || '{}');

    const systemMessages = modelProfile.system_prompt
      ? [{ role: 'system', content: modelProfile.system_prompt }]
      : [];

    const stream = await this.client.chat.completions.create({
      model: modelProfile.model_id,
      max_tokens: params.max_tokens || 4096,
      temperature: params.temperature || 0.7,
      messages: [
        ...systemMessages,
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async generateMetadata(sessionContent) {
    try {
      const response = await this.client.chat.completions.create({
        model: OpenAIProvider.UTILITY_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${METADATA_PROMPT}\n\nConversation:\n${sessionContent}`,
          },
        ],
      });

      const text = response.choices[0].message.content;
      return JSON.parse(text);
    } catch (error) {
      console.error('Metadata generation failed:', error);
      return {
        orientation_blurb: 'Unable to generate summary',
        unresolved_edge: 'Unknown',
        last_pivot: 'Unknown',
      };
    }
  }

  async generateTitle(sessionContent) {
    try {
      const response = await this.client.chat.completions.create({
        model: OpenAIProvider.UTILITY_MODEL,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: `${TITLE_PROMPT}\n\nConversation:\n${sessionContent}`,
          },
        ],
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Title generation failed:', error);
      return null;
    }
  }
}
