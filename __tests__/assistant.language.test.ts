// Pure unit tests for language detection. This module exists because live
// testing against the real EjoChat API showed a soft "respond in the same
// language" instruction wasn't reliable on its own - the orchestrator now
// names the target language explicitly, and this is what decides which
// language to name.
import { detectLanguage, resolveLanguage } from '../src/services/assistant/language.service';

describe('detectLanguage', () => {
  it('detects English from common stopwords', () => {
    expect(detectLanguage('What is NPC Innovation Hub?')).toBe('en');
    expect(detectLanguage('How can you help me with your projects?')).toBe('en');
  });

  it('detects Kinyarwanda from common stopwords', () => {
    expect(detectLanguage('Ni ubuhe bushobozi NPC Innovation Hub ifite?')).toBe('rw');
    expect(detectLanguage('Ese ikigo cyanjye gikorera he?')).toBe('rw');
  });

  it('detects French from common stopwords', () => {
    expect(detectLanguage('Bonjour, comment puis-je vous contacter?')).toBe('fr');
  });

  it('detects Swahili from common stopwords', () => {
    expect(detectLanguage('Habari, unaweza kunieleza kuhusu NPC Innovation Hub?')).toBe('sw');
  });

  it('defaults to English on empty or unrecognizable input', () => {
    expect(detectLanguage('')).toBe('en');
    expect(detectLanguage('12345 !!! ???')).toBe('en');
  });
});

describe('resolveLanguage', () => {
  it('trusts an explicit, valid client hint over detection', () => {
    // Message text reads as English, but the client explicitly asked for
    // Kinyarwanda (e.g. a language switcher in the UI) - the hint wins.
    expect(resolveLanguage('What is NPC Innovation Hub?', 'rw')).toBe('rw');
  });

  it('falls back to detection when the client hint is missing', () => {
    expect(resolveLanguage('What is NPC Innovation Hub?', undefined)).toBe('en');
  });

  it('falls back to detection when the client hint is invalid/unrecognized', () => {
    expect(resolveLanguage('What is NPC Innovation Hub?', 'not-a-real-language')).toBe('en');
  });
});
