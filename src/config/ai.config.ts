/**
 * AI Assistant configuration
 *
 * Centralizes every env-driven knob for the NPC AI Assistant so no other
 * file reads process.env directly for this feature. AI_PROVIDER exists so
 * a future provider can be added without touching call sites - see
 * src/providers/ai/EjoChatProvider.ts for the only implementation today.
 */
import dotenv from 'dotenv';

dotenv.config();

const numFromEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'ejochat',

  ejochat: {
    apiKey: process.env.EJOCHAT_API_KEY,
    baseUrl: process.env.EJOCHAT_BASE_URL || 'https://api.ejolabs.com/api/v1',
  },

  // Milliseconds before a provider call is aborted.
  requestTimeoutMs: numFromEnv(process.env.AI_REQUEST_TIMEOUT_MS, 15000),

  // Hard cap on a single incoming chat message's length.
  maxMessageLength: numFromEnv(process.env.AI_MAX_MESSAGE_LENGTH, 1000),

  // Prior turns are capped server-side to this many, regardless of how
  // many the client sends - see chatOrchestrator.service.ts. Keeps
  // per-request cost bounded and stops a long conversation from re-paying
  // for every prior turn on every new turn.
  maxHistoryMessages: numFromEnv(process.env.AI_MAX_HISTORY_MESSAGES, 8),

  // Requests per minute, keyed by authenticated user id (or IP if
  // anonymous) - see rateLimit.middleware.ts's assistantChatLimiter.
  rateLimitPerMinute: numFromEnv(process.env.AI_RATE_LIMIT_PER_MINUTE, 15),

  // Requests per day, same key.
  dailyLimit: numFromEnv(process.env.AI_DAILY_LIMIT, 200),
};
