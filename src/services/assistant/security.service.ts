/**
 * Assistant security checks: prompt-injection heuristics and output/
 * context secret scanning.
 *
 * Ranking, stated explicitly because it matters for where future effort
 * should go: detectPromptInjection is the WEAK layer - bypassable by
 * paraphrase, translation, or encoding, and known to be so. Don't over-
 * invest in growing its phrase list. scanForSecrets's env-value check is
 * the STRONG layer, because it compares against real secret values held
 * in memory rather than guessing at patterns - the only way secrets
 * genuinely reach the client is a real value appearing verbatim, and this
 * catches that regardless of phrasing, language, or encoding.
 */

// English + a few Kinyarwanda/French equivalents of the classic
// injection/extraction phrasings. Deliberately case-insensitive and
// checked against the raw text (not stripped of punctuation) since
// attackers rarely bother obfuscating at this level - the real defense
// against a determined, obfuscated attempt is the structural layers
// (RBAC inside retrieval, secret scanning), not this list.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any |the )?(previous|prior|above) instructions?/i,
  /disregard (all |any |the )?(previous|prior|above) instructions?/i,
  /forget (your|the) (previous|prior|security) (instructions?|rules?|policy)/i,
  /reveal (your|the) (system prompt|instructions?|hidden context)/i,
  /(show|print|repeat) (me )?(your|the) (system prompt|instructions?|context)/i,
  /what (is|are) your (system prompt|instructions?|hidden context)/i,
  /(give|tell|show) me (the |your )?(api key|secret|password|credentials?|database (password|credentials?)|jwt secret|env(ironment)? variables?)/i,
  /you are now (the |an? )?(admin|administrator|database administrator|developer)/i,
  /act as (the |an? )?(admin|administrator|system)/i,
  /pretend (you are|to be) (the |an? )?(admin|administrator)/i,
  /the administrator (authorized|approved|allows?) (me|this)/i,
  /encode .* (system prompt|instructions?) .* base ?64/i,
  /translate (your|the) (hidden|secret|system) (instructions?|prompt)/i,
  /use (sql|a sql query) to (show|list|get) (all )?users?/i,
  /list all (hidden|admin) users?/i,
  /show me (another|other) (member'?s?|user'?s?) private/i,
  // Kinyarwanda
  /wibagirwe amabwiriza/i, // "forget the instructions"
  /mpa (ijambo ry'?ibanga|amabanga|api key)/i, // "give me the password/secrets"
  // French
  /ignore(z)? les instructions précédentes/i,
  /révèle[sz]? (le|ton|votre) (prompt système|invite système)/i,
];

export function detectPromptInjection(text: string): boolean {
  if (!text) return false;
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

// Secret-SHAPED patterns - a useful first pass, but these are guesses
// about format, not certainty. Kept intentionally narrow (real formats
// actually used by providers this app talks to) rather than a giant
// generic "anything that looks like a token" regex, which would false-
// positive constantly on legitimate long alphanumeric answer text.
const SECRET_SHAPE_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/, // JWT
  /\bsk-[A-Za-z0-9]{16,}\b/, // OpenAI-style
  /\bejochat_[A-Za-z0-9]{16,}\b/, // EjoChat key prefix
  /\bkgpt_[A-Za-z0-9]{16,}\b/, // EjoChat alt prefix
  /\bgsk_[A-Za-z0-9]{16,}\b/, // Groq-style
  /\b[A-Z][A-Z0-9_]{3,}=[^\s]{6,}/, // ENV_VAR=value-looking line
];

// Real secret values actually loaded into this process right now. Only
// non-empty values are included - checking text.includes("") would match
// everything. This is deliberately read fresh (not module-scoped) so
// tests can set/unset env vars and see it reflected without needing to
// reload the module.
function getLoadedSecretValues(): string[] {
  const candidateVars = [
    'JWT_SECRET',
    'REFRESH_SECRET',
    'EJOCHAT_API_KEY',
    'HUGGING_FACE_API_KEY',
    'DB_PASSWORD',
    'DB_URL',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_API_KEY',
    'EMAIL_PASS',
    'GOOGLE_SECRET',
    'CLIENT_SECRET',
    'SENDGRID_API_KEY',
  ];

  return candidateVars
    .map((name) => process.env[name])
    .filter((value): value is string => Boolean(value && value.length >= 6));
}

export interface SecretScanResult {
  safe: boolean;
  reason?: string;
}

/**
 * Scan a block of text (assembled context before the provider call, or
 * the provider's response after it) for anything that looks like or
 * actually is a real configured secret. Called at both boundaries by
 * chatOrchestrator.service.ts - this function itself doesn't care which.
 */
export function scanForSecrets(text: string): SecretScanResult {
  if (!text) return { safe: true };

  for (const secret of getLoadedSecretValues()) {
    if (text.includes(secret)) {
      return { safe: false, reason: 'matched a real configured secret value' };
    }
  }

  for (const pattern of SECRET_SHAPE_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, reason: 'matched a secret-shaped pattern' };
    }
  }

  return { safe: true };
}

/**
 * The safe, generic response used whenever an injection attempt is
 * detected or a secret-scan blocks a response - deliberately does not
 * confirm or deny that anything specific (a key, a password, a hidden
 * prompt) exists, per the mission's explicit guidance not to respond in a
 * way that confirms the existence of a secret.
 */
export const SAFE_REDIRECT_MESSAGE =
  "I can help with information about NPC Innovation Hub, its public services, projects, activities, and other information you're authorized to access.";
