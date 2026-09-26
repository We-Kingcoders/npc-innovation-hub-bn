/**
 * Lightweight language detection for the NPC AI Assistant.
 *
 * Why this exists: live testing against the real EjoChat API showed that
 * asking the model to "respond in the same language as this message" is
 * NOT reliable - EjoChat has a strong default bias toward Kinyarwanda (its
 * primary language) and answered a clearly English question in
 * Kinyarwanda even with that instruction present. Naming the target
 * language explicitly ("Respond only in English.") is a directive the
 * model can follow mechanically instead of one it has to infer, and this
 * is what actually worked in live re-testing.
 *
 * This is intentionally a small stopword-scoring heuristic, not a real
 * language-ID model - matches the codebase's existing preference for
 * simple, explainable logic over new ML dependencies at this content
 * scale (see knowledgeRetrieval.service.ts's rule-based intent
 * classifier for the same tradeoff).
 */
export type AssistantLanguage = 'en' | 'rw' | 'fr' | 'sw';

export const LANGUAGE_NAMES: Record<AssistantLanguage, string> = {
  en: 'English',
  rw: 'Kinyarwanda',
  fr: 'French',
  sw: 'Swahili',
};

const STOPWORDS: Record<AssistantLanguage, string[]> = {
  en: ['the', 'is', 'are', 'what', 'how', 'who', 'when', 'where', 'why', 'can', 'you', 'your', 'about', 'please', 'hello', 'hi', 'thanks', 'thank'],
  rw: ['ni', 'cyangwa', 'kandi', 'ese', 'nde', 'ubuhe', 'ubuki', 'ubwo', 'gute', 'ibiki', 'witwa', 'murakoze', 'muraho', 'ndese', 'nde', 'aho', 'ryari', 'gukorera', 'ikigo', 'urubuga', 'bushobozi', 'amakuru'],
  fr: ['le', 'la', 'les', 'est', 'que', 'qui', 'quoi', 'pourquoi', 'comment', 'bonjour', 'merci', 'vous', 'votre', 'avec', 'pour', 'sont'],
  sw: ['na', 'ya', 'kwa', 'habari', 'asante', 'nini', 'wapi', 'jinsi', 'gani', 'unaweza', 'tafadhali', 'karibu', 'ndio'],
};

/**
 * Best-effort detection: score word overlap with each language's stopword
 * list, pick the highest score. Defaults to English on a tie or no match
 * at all, matching the system prompt's existing "default to English when
 * ambiguous" rule.
 */
export function detectLanguage(text: string): AssistantLanguage {
  const words = text.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñ]+/g) || [];
  if (words.length === 0) return 'en';

  const scores: Record<AssistantLanguage, number> = { en: 0, rw: 0, fr: 0, sw: 0 };
  for (const word of words) {
    for (const lang of Object.keys(STOPWORDS) as AssistantLanguage[]) {
      if (STOPWORDS[lang].includes(word)) {
        scores[lang] += 1;
      }
    }
  }

  let best: AssistantLanguage = 'en';
  let bestScore = scores.en;
  for (const lang of Object.keys(scores) as AssistantLanguage[]) {
    if (scores[lang] > bestScore) {
      best = lang;
      bestScore = scores[lang];
    }
  }
  return bestScore > 0 ? best : 'en';
}

/**
 * Resolve the language to respond in: an explicit, validated client hint
 * wins (the user picked it in the UI); otherwise detect it from the
 * message text itself.
 */
export function resolveLanguage(message: string, clientHint?: string): AssistantLanguage {
  if (clientHint === 'en' || clientHint === 'rw' || clientHint === 'fr' || clientHint === 'sw') {
    return clientHint;
  }
  return detectLanguage(message);
}
