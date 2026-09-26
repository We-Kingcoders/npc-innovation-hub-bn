/**
 * EjoChat provider
 *
 * Talks to the real, verified EjoChat API contract:
 *   POST {EJOCHAT_BASE_URL}/subiza
 *   Header: X-API-Key: <key>
 *   Body:   { messages: [{ role: 'user'|'assistant', content: string }] }
 *   Reply:  { choices: [{ message: { role, content } }], usage, request_id, latency_ms }
 *
 * Verified with real live calls against api.ejolabs.com during
 * implementation - this is not a guessed/invented contract. The exact
 * error-response shape isn't publicly documented, so error handling below
 * is defensive: it maps by HTTP status/exception type into a small set of
 * internal categories rather than trying to parse a specific provider
 * error body.
 *
 * No provider interface/abstract class here on purpose - this codebase
 * has no interfaces or DI anywhere else. A second provider, if one is
 * ever added, gets its own file exporting the same getCompletion
 * signature; callers (chatOrchestrator.service.ts) depend on that
 * function shape, not a class hierarchy.
 */
import { AI_CONFIG } from '../../config/ai.config';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIProviderErrorCategory =
  | 'unauthorized'
  | 'rate_limited'
  | 'invalid_request'
  | 'timeout'
  | 'network_error'
  | 'provider_error'
  | 'unknown';

export class AIProviderError extends Error {
  category: AIProviderErrorCategory;

  constructor(category: AIProviderErrorCategory, message: string) {
    super(message);
    this.name = 'AIProviderError';
    this.category = category;
  }
}

/**
 * Send a chat completion request to EjoChat and return only the reply
 * text. Never throws the raw provider response body - callers only ever
 * see an AIProviderError with a category, never provider-specific detail
 * that could leak configuration/infrastructure information to a client.
 */
export async function getCompletion(messages: AIMessage[]): Promise<{ content: string }> {
  const { apiKey, baseUrl } = AI_CONFIG.ejochat;

  if (!apiKey) {
    // Misconfiguration, not a provider failure - fail loudly server-side,
    // generically to any caller.
    console.error('[EjoChatProvider] EJOCHAT_API_KEY is not configured');
    throw new AIProviderError('provider_error', 'AI provider is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/subiza`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AIProviderError('timeout', 'AI provider request timed out');
    }
    console.error('[EjoChatProvider] Network error calling EjoChat:', err);
    throw new AIProviderError('network_error', 'Could not reach AI provider');
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    console.error('[EjoChatProvider] EjoChat rejected our API key (status', response.status, ')');
    throw new AIProviderError('unauthorized', 'AI provider rejected the request');
  }
  if (response.status === 429) {
    throw new AIProviderError('rate_limited', 'AI provider rate limit exceeded');
  }
  if (response.status >= 500) {
    console.error('[EjoChatProvider] EjoChat returned', response.status);
    throw new AIProviderError('provider_error', 'AI provider is temporarily unavailable');
  }
  if (response.status >= 400) {
    console.error('[EjoChatProvider] EjoChat rejected the request with status', response.status);
    throw new AIProviderError('invalid_request', 'AI provider rejected the request');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    console.error('[EjoChatProvider] EjoChat response was not valid JSON:', err);
    throw new AIProviderError('provider_error', 'AI provider returned a malformed response');
  }

  const content = extractContent(data);
  if (!content) {
    console.error('[EjoChatProvider] EjoChat response had no usable content:', JSON.stringify(data).slice(0, 300));
    throw new AIProviderError('provider_error', 'AI provider returned an empty response');
  }

  return { content };
}

// EjoChat's real, verified response shape is
// { choices: [{ message: { content } }] } - defensively also checks a
// couple of other common LLM-API shapes in case the provider changes its
// response format without notice, rather than hard-crashing on anything
// unexpected.
function extractContent(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  const choices = obj.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string' && message.content.trim()) {
      return message.content;
    }
  }

  if (typeof obj.reply === 'string' && obj.reply.trim()) return obj.reply;
  if (typeof obj.content === 'string' && obj.content.trim()) return obj.content;
  if (typeof obj.answer === 'string' && obj.answer.trim()) return obj.answer;

  return null;
}
