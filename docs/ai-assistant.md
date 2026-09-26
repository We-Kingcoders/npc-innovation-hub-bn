# NPC AI Assistant (EjoChat-backed)

Replaces the previous "Chat with Us" widget, which had no working backend at
all: the frontend posted straight to `VITE_CHATBOT_API_URL`
(`http://localhost:8000`), a FastAPI service that never existed in either
repo. Every request failed with a connection error, caught by a blanket
`catch` that always rendered the same generic string. This is a greenfield
backend build, not a bug fix.

## Architecture

```
User -> Chat UI -> POST /api/assistant/chat
     -> attachUserIfPresent (optional auth, never rejects)
     -> assistantChatLimiter / assistantDailyLimiter (per-user or per-IP)
     -> validateChatRequest (Joi)
     -> assistant.controller.chat
     -> chatOrchestrator.handleChatMessage
          -> validate/truncate history, resolve reply language
          -> detectPromptInjection + scanForSecrets (full payload)
          -> knowledgeRetrieval.retrieveKnowledge(message, user)   [RBAC gate]
          -> scanForSecrets (assembled context, pre-flight)
          -> buildSystemPrompt(context)
          -> EjoChatProvider.getCompletion(messages)
          -> scanForSecrets (response, post-flight)
     -> friendly error mapping or safe response -> User
```

**The backend is the only authorization boundary.** The LLM never decides
what a user is allowed to see - `knowledgeRetrieval.service.ts` filters data
by the verified `user` object *before* anything is assembled into the
system prompt. The model only ever sees a pre-filtered, minimal text
projection, never raw database rows and never a `req` object.

## The EjoChat contract (verified live, not assumed)

- `POST {EJOCHAT_BASE_URL}/subiza`, header `X-API-Key: <key>`
- Request: `{ "messages": [{ "role": "system"|"user"|"assistant", "content": "..." }] }`
- Response: `{ "choices": [{ "message": { "role", "content" } }], "usage": {...}, "request_id": "...", "latency_ms": N }`
- `system` role is honored and takes priority over the user's own message
  (confirmed by a live test where a system instruction overrode the
  question).
- Error response shape isn't publicly documented - `EjoChatProvider.ts`
  handles this defensively, mapping by HTTP status/exception type into a
  small set of categories (`unauthorized`, `rate_limited`, `invalid_request`,
  `timeout`, `network_error`, `provider_error`, `unknown`) rather than
  parsing/relaying a specific provider error body.
- **Known limitation, found only via live testing**: EjoChat has a strong
  default bias toward Kinyarwanda (its primary language). A soft instruction
  ("respond in the same language as this message") was not reliable - an
  English question was answered in Kinyarwanda even with that instruction
  present in the system prompt. Fixed by `language.service.ts`: detect (or
  accept an explicit client hint for) the target language up front, then
  append an explicit, unambiguous directive naming it
  (`[SYSTEM INSTRUCTION: You must respond only in English...]`) directly
  next to the user's message - the most attention-weighted position - rather
  than relying on the model to infer it. Verified fixed via repeated live
  calls (English question -> English answer, Kinyarwanda question ->
  Kinyarwanda answer).

## RAG / knowledge retrieval

No vector DB or embeddings - content volume (dozens of rows per domain)
doesn't justify that infrastructure. `knowledgeRetrieval.service.ts` uses a
rule-based keyword intent classifier (`classifyIntent`) to decide which
domain(s) to query, then runs direct, filtered Sequelize queries that
replicate the exact filter each already-public controller uses (e.g. blogs
require `isPublished: true`, matching `blog.controller.ts`). Every result is
capped (`RESULT_CAP = 5`) and reduced to a minimal safe text projection
(title/name/short excerpt), never a full row.

Two structural RBAC gates, independent of whether the intent classifier
guessed correctly:

- **Resources** (every real resource route requires auth, no exceptions) are
  only ever fetched when a real authenticated `user` is passed in.
- **"My tasks"/"my profile"** context is scoped strictly to
  `getOwnAuthenticatedContext(user.id)` - the id comes from the verified JWT,
  never from anything in the request body/message text.

## Security pipeline

Two layers, explicitly ranked (see `security.service.ts`'s own comment):

- **`detectPromptInjection`** - heuristic phrase matching (EN/RW/FR). This is
  the *weak*, bypassable-by-paraphrase layer. Don't over-invest in growing
  it; it exists to catch the common case cheaply.
- **`scanForSecrets`** - the *strong* layer. Compares text against the
  actual, currently-loaded secret env values (`JWT_SECRET`,
  `EJOCHAT_API_KEY`, `DB_PASSWORD`, etc.) plus a few secret-shaped regex
  patterns (JWT, known key prefixes). This is what actually prevents a
  secret from reaching a client, regardless of phrasing/language/encoding.

Both scans run against the **entire** incoming payload (every history
message plus the new one), not just the new message - a client can
fabricate a fake prior assistant turn to bootstrap a jailbreak, and the
model has no way to know a history entry wasn't real.

`scanForSecrets` runs twice server-side: once on the assembled context
before it's ever sent to EjoChat (pre-flight - catches an over-broad
retrieval before it leaves this server), and once on the provider's
response (post-flight - catches provider-side surprises).

Any hit on either layer returns `SAFE_REDIRECT_MESSAGE` - a generic, helpful
message that never confirms or denies that a specific secret/prompt exists.

## Data classification

- **Public** (no gate): org facts, projects, upcoming events, published
  blogs, hero members, alumni.
- **Authenticated-only**: learning resources (matches the real
  `resource.routes.ts`, which requires auth on every route).
- **Owner-only**: "my profile"/"my tasks" - scoped to the JWT's own id.

Nothing above SYSTEM_SECRET/ADMIN-tier exists in this v1 - see Scope
decisions below.

## Privacy / data minimization

Only the minimal projected text described above is ever sent to EjoChat -
never a full user/member/project row, never an email address, never
anything from a table not explicitly queried by `knowledgeRetrieval.service.ts`.
Treat everything sent to EjoChat as having left this backend's trust
boundary.

## `attachUserIfPresent` - the one safety-critical middleware

The frontend's shared `apiClient` (`src/api/client.ts`) treats **any** 401
from **any** endpoint as "clear the token, hard-redirect to `/login`". This
route needs to work for both anonymous and authenticated callers, so
`attachUserIfPresent` (`auth.middleware.ts`) was written from scratch:
**every** failure path (missing header, missing `JWT_SECRET`, blacklisted
token, invalid/expired/forged token) falls through to `next()` with
`req.user` left `undefined` - it never calls `res.status(401)`, under any
circumstance. A bug here would have silently logged real users out just for
typing into the chat widget with a slightly stale token.

Because of this, `assistantChatLimiter`/`assistantDailyLimiter` (keyed by
`req.user?.id || ipKeyGenerator(req.ip)`) must run **after**
`attachUserIfPresent` in the route - the opposite order from every other
limiter in this codebase (login/signup precede authentication by
definition, since there's no user yet).

## v1 scope decisions (deliberate, not silent)

1. **No vector DB / embeddings RAG** - rule-based intent classification is
   real grounding at this content scale. Revisit if content volume grows an
   order of magnitude.
2. **No persisted conversation table.** History is client-side,
   server-truncated to `AI_MAX_HISTORY_MESSAGES` turns on every request
   (not just rejected when longer). `conversationId` is an opaque,
   client-generated string used only for log correlation - never a
   stored/retrievable resource, so there's no `GET /conversation/:id` IDOR
   surface to defend, because nothing is stored server-side.
3. **No admin-elevated tool-calling framework.** Admin is treated like
   Member for assistant purposes in v1 (same public grounding, same
   "my data" scoping). A real allowlisted-admin-tools system with its own
   audit trail is future work.
4. **No metrics dashboard.** Structured `console.log`/`console.error` for
   security-relevant events (`logSecurityEvent` in
   `chatOrchestrator.service.ts`), matching this backend's existing logging
   style everywhere else.

## Required environment variables

```
AI_PROVIDER=ejochat
EJOCHAT_API_KEY=
EJOCHAT_BASE_URL=https://api.ejolabs.com/api/v1
AI_REQUEST_TIMEOUT_MS=15000
AI_MAX_MESSAGE_LENGTH=1000
AI_MAX_HISTORY_MESSAGES=8
AI_RATE_LIMIT_PER_MINUTE=15
AI_DAILY_LIMIT=200
```

`EJOCHAT_API_KEY` must never be exposed to the browser - it is read only by
`EjoChatProvider.ts`, server-side.

## Running / testing locally

```bash
# Backend
cd npc-innovation-hub-bn
npm install
npx tsc --noEmit
npx eslint src/services/assistant src/controllers/assistant.controller.ts src/providers/ai

# Full suite against a disposable local Postgres (see __tests__/globalSetup.ts)
docker run -d --name npc-ai-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=npc_test -p 5441:5432 postgres:14-alpine
NODE_ENV=test DB_HOST=localhost DB_PORT=5441 DB_NAME=npc_test DB_USER=postgres DB_PASSWORD=postgres npx jest

# Frontend
cd npc-innovation-hub
npm install
npx eslint src/api/assistant.api.ts src/pages/Hub-info/Help.tsx
npx jest src/pages/Hub-info/Help.test.tsx
npm run build
```

## Test coverage added

- `assistant.security.test.ts` - injection heuristics, secret scanning
  (real env-value match and secret-shaped patterns), safe-redirect message
  never confirms a specific secret.
- `assistant.language.test.ts` - language detection and explicit-hint
  resolution.
- `assistant.knowledgeRetrieval.test.ts` - real disposable Postgres;
  structural RBAC (resources/own-data never leak to anonymous or
  cross-user callers), unpublished-blog exclusion, intent classification.
- `assistant.attachUserIfPresent.test.ts` - every failure path (missing,
  malformed, expired, forged, blacklisted token) proceeds anonymously and
  never 401s.
- `assistant.rateLimit.test.ts` - the assistant limiter keys by
  authenticated user id, not a shared IP bucket.
- `assistant.chatOrchestrator.test.ts` - injection/secret-scan gating
  (pre- and post-flight), provider error category mapping, explicit
  language directive construction, server-side history truncation.
- `assistant.controller.test.ts` - end-to-end HTTP coverage: anonymous and
  authenticated success, validation 400s, provider-failure friendly-message
  mapping, never a 401 for a garbage token, never a leaked stack
  trace/file path in an error response.
- `Help.test.tsx` (frontend) - suggested-question sending, Enter-to-send,
  conversationId continuity across turns, distinct error message with a
  working Retry, empty-message guard.

A temporary live-smoke test (`_smoke.assistant.test.ts`, making real
EjoChat calls) was used during development to verify the live contract and
the language fix, then deleted - it isn't part of the permanent suite since
it consumes real API quota.

## Known EjoChat limitations

- Default language bias toward Kinyarwanda (mitigated - see above).
- Rate limits vary by plan (as low as 10/min or 50/day on a free tier) -
  `AI_RATE_LIMIT_PER_MINUTE`/`AI_DAILY_LIMIT` should be tuned to whatever
  plan is actually provisioned.
- Error response body shape is not publicly documented; this integration
  never assumes a specific shape.

## Recommended future improvements

- Move `npcKnowledgeBase.ts`'s static org facts into a CMS/DB table instead
  of hand-kept-in-sync-with-frontend constants.
- Vector-search RAG if content volume grows substantially.
- A persisted conversation table with real ownership checks, if multi-device
  conversation continuity becomes a requirement.
- An allowlisted admin-tools framework with its own audit log, if the
  assistant needs to do more for Admins than answer questions.
