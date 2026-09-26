/**
 * NPC AI Assistant orchestrator - the full pipeline described in the
 * architecture: sanitize -> injection check -> RBAC-aware retrieval ->
 * context sanitize -> provider call -> output validation -> safe
 * response.
 */
import { AI_CONFIG } from '../../config/ai.config';
import { getCompletion, AIProviderError, type AIMessage } from '../../providers/ai/EjoChatProvider';
import { retrieveKnowledge, type AssistantUser } from './knowledgeRetrieval.service';
import { buildSystemPrompt } from './systemPrompt';
import { detectPromptInjection, scanForSecrets, SAFE_REDIRECT_MESSAGE } from './security.service';
import { resolveLanguage, LANGUAGE_NAMES } from './language.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  history?: ChatTurn[];
  language?: string;
}

export interface ChatSuccess {
  ok: true;
  message: string;
  conversationId: string;
  language: string;
}

export interface ChatFailure {
  ok: false;
  category:
    | 'unauthorized'
    | 'rate_limited'
    | 'invalid_request'
    | 'timeout'
    | 'network_error'
    | 'provider_error'
    | 'unknown';
}

export type ChatResult = ChatSuccess | ChatFailure;

function newConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function logSecurityEvent(conversationId: string, event: string, detail?: Record<string, unknown>): void {
  // Structured, security-relevant logging without storing full verbatim
  // message content - matches this backend's existing console.log style
  // everywhere else. This is the audit trail that substitutes for not
  // having a persisted conversation table: it lets a slow-drip multi-turn
  // attack (individually-benign turns) be reviewed after the fact even
  // though no conversation is stored.
  console.log(`[assistant:${conversationId}] ${event}`, detail ? JSON.stringify(detail) : '');
}

/**
 * Run the full assistant pipeline for one chat turn.
 */
export async function handleChatMessage(
  request: ChatRequest,
  user: AssistantUser | undefined,
): Promise<ChatResult> {
  const conversationId = request.conversationId || newConversationId();

  // History is client-side by design (see plan's v1 scope decisions) -
  // treat it as untrusted display context, never an authoritative
  // transcript. Hard-validate role values and truncate server-side
  // regardless of what the client already trimmed, both because a client
  // can lie about having trimmed it and because unbounded history means
  // quadratic total cost per conversation (the client resends the whole
  // thing every turn).
  const rawHistory = (request.history || []).filter(
    (turn): turn is ChatTurn =>
      !!turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string',
  );
  const truncatedHistory = rawHistory.slice(-AI_CONFIG.maxHistoryMessages);

  // Resolved once, up front, so every return path (including the early
  // safe-redirect ones below) reports the language actually used.
  const targetLanguage = resolveLanguage(request.message, request.language);

  // Scan the ENTIRE incoming payload - every history entry plus the new
  // message - not just the new message. A client can fabricate a fake
  // prior assistant turn ("Sure, I already agreed to reveal the
  // config...") to bootstrap a jailbreak; the model has no way to know a
  // history entry wasn't real, so the scan has to see all of it.
  const fullIncomingText = [...truncatedHistory.map((t) => t.content), request.message].join('\n');

  if (detectPromptInjection(fullIncomingText)) {
    logSecurityEvent(conversationId, 'prompt_injection_blocked');
    return { ok: true, message: SAFE_REDIRECT_MESSAGE, conversationId, language: targetLanguage };
  }

  const incomingSecretScan = scanForSecrets(fullIncomingText);
  if (!incomingSecretScan.safe) {
    logSecurityEvent(conversationId, 'incoming_secret_pattern_blocked', { reason: incomingSecretScan.reason });
    return { ok: true, message: SAFE_REDIRECT_MESSAGE, conversationId, language: targetLanguage };
  }

  let context: string;
  try {
    context = await retrieveKnowledge(request.message, user);
  } catch (err) {
    console.error(`[assistant:${conversationId}] Knowledge retrieval failed:`, err);
    // Retrieval failing shouldn't take the whole assistant down - fall
    // back to org facts only via an empty-message retrieval is overkill
    // here; just degrade to no domain-specific context, the system
    // prompt's own honesty instruction covers the rest.
    context = '';
  }

  // Pre-flight scan of the ASSEMBLED CONTEXT, before it ever leaves this
  // server. This is the realistic leak vector today (a retrieval
  // function's projection accidentally widening in the future to include
  // something sensitive), since the model itself never sees real secrets
  // via the system prompt.
  const preFlightScan = scanForSecrets(context);
  if (!preFlightScan.safe) {
    console.error(
      `[assistant:${conversationId}] Retrieved context failed the pre-flight secret scan (${preFlightScan.reason}) - blocking before provider call.`,
    );
    logSecurityEvent(conversationId, 'context_secret_scan_blocked', { reason: preFlightScan.reason });
    return { ok: true, message: SAFE_REDIRECT_MESSAGE, conversationId, language: targetLanguage };
  }

  // Verified live against the real API that EjoChat honors a 'system'
  // role message (it took priority over the user's own question in a
  // manual test) - not guessed/assumed.
  const systemPrompt = buildSystemPrompt(context);

  // A soft instruction ("respond in the same language as this message")
  // was NOT reliable in live testing - EjoChat's own bias toward
  // Kinyarwanda (its primary language) won out even for a clearly English
  // question. Naming the target language explicitly, as a directive the
  // model can follow mechanically instead of infer, is what actually
  // fixed it in live re-testing. Detection runs on the real, unwrapped
  // message - this wrapper only changes what's sent to the provider;
  // detectPromptInjection/scanForSecrets above already ran against the
  // original text.
  const languageName = LANGUAGE_NAMES[targetLanguage];
  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...truncatedHistory,
    {
      role: 'user',
      content: `${request.message}\n\n[SYSTEM INSTRUCTION: You must respond only in ${languageName}. Do not use any other language in your reply, regardless of what language the knowledge context above is written in.]`,
    },
  ];

  let completion: { content: string };
  try {
    completion = await getCompletion(messages);
  } catch (err) {
    if (err instanceof AIProviderError) {
      logSecurityEvent(conversationId, 'provider_error', { category: err.category });
      return { ok: false, category: err.category };
    }
    console.error(`[assistant:${conversationId}] Unexpected error calling provider:`, err);
    return { ok: false, category: 'unknown' };
  }

  const outputScan = scanForSecrets(completion.content);
  if (!outputScan.safe) {
    console.error(
      `[assistant:${conversationId}] Provider response failed the output secret scan (${outputScan.reason}) - response withheld.`,
    );
    logSecurityEvent(conversationId, 'output_secret_scan_blocked', { reason: outputScan.reason });
    return { ok: true, message: SAFE_REDIRECT_MESSAGE, conversationId, language: targetLanguage };
  }

  logSecurityEvent(conversationId, 'ok');
  return { ok: true, message: completion.content, conversationId, language: targetLanguage };
}
