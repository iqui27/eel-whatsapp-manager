/**
 * Message Variation Engine
 * 
 * Applies variations to messages to avoid WhatsApp's hash detection:
 * - Spintax resolution: {Olá|Oi|E aí} → random selection
 * - Greeting rotation: time-appropriate greetings
 * - Emoji variation: random emoji at strategic positions
 * - Structural variation: filler words, punctuation changes
 */
import crypto from 'crypto';

// ─── Spintax Resolution ────────────────────────────────────────────────────────

/**
 * Resolve spintax notation to a random selection.
 * 
 * Examples:
 * - "{Olá|Oi|E aí}" → "Olá" (random)
 * - "{{bom dia|boa tarde}}" → "bom dia" or "boa tarde"
 * - "Olá {nome}, tudo {bem|bom}?" → "Olá João, tudo bem?"
 */
export function resolveSpintax(text: string): string {
  // Match {option1|option2|option3} pattern
  const spintaxRegex = /\{([^{}]+)\}/g;
  
  let result = text;
  let match: RegExpExecArray | null;
  
  // Keep resolving until no more spintax found
  while ((match = spintaxRegex.exec(result)) !== null) {
    const fullMatch = match[0];
    const options = match[1].split('|');
    
    if (options.length > 0) {
      const selected = options[randomInt(0, options.length - 1)];
      result = result.replace(fullMatch, selected);
      // Reset regex index after replacement
      spintaxRegex.lastIndex = 0;
    }
  }
  
  return result;
}

/**
 * Check if text contains unresolved spintax patterns.
 */
export function hasSpintax(text: string): boolean {
  return /\{[^{}]+\}/.test(text);
}

// ─── Greeting Variation ─────────────────────────────────────────────────────────

const MORNING_GREETINGS = [
  'Bom dia',
  'Bom dia!',
  'Tenha um bom dia',
  'Bom dia, tudo bem?',
];

const AFTERNOON_GREETINGS = [
  'Boa tarde',
  'Boa tarde!',
  'Tenha uma boa tarde',
  'Boa tarde, tudo bem?',
];

const EVENING_GREETINGS = [
  'Boa noite',
  'Boa noite!',
  'Tenha uma boa noite',
  'Boa noite, tudo bem?',
];

const GREETING_PATTERN = /^(bom dia|boa tarde|boa noite|olá|oi|e aí|fala|hey|hello)/i;

/**
 * Add a time-appropriate greeting at the start of message.
 * Only if message doesn't already start with a greeting.
 */
export function addGreetingVariation(text: string, hour?: number): string {
  // Check if already starts with a greeting
  if (GREETING_PATTERN.test(text.trim())) {
    return text;
  }
  
  const currentHour = hour ?? new Date().getHours();
  
  let greeting: string;
  if (currentHour >= 5 && currentHour < 12) {
    greeting = MORNING_GREETINGS[randomInt(0, MORNING_GREETINGS.length - 1)];
  } else if (currentHour >= 12 && currentHour < 18) {
    greeting = AFTERNOON_GREETINGS[randomInt(0, AFTERNOON_GREETINGS.length - 1)];
  } else {
    greeting = EVENING_GREETINGS[randomInt(0, EVENING_GREETINGS.length - 1)];
  }
  
  return `${greeting}! ${text}`;
}

// ─── Emoji Variation ───────────────────────────────────────────────────────────

const SENTENCE_END_EMOJIS = ['👋', '✨', '💪', '🙏', '😊', '✅', '👍', '🎯'];
const CALL_TO_ACTION_EMOJIS = ['👉', '🔗', '📱', '💡', '📢', '⚡'];
const THANK_YOU_EMOJIS = ['🙏', '❤️', '💕', '✨'];

/**
 * Add emoji at strategic positions (sentence ends, before CTAs).
 * 30% chance per position to avoid over-emoji-fication.
 */
export function addEmojiVariation(text: string): string {
  let result = text;
  
  // Add emoji at end of sentences (30% chance)
  if (Math.random() < 0.3) {
    const sentences = result.split(/(?<=[.!?])\s+/);
    if (sentences.length > 0) {
      const lastSentence = sentences[sentences.length - 1];
      if (lastSentence && !lastSentence.match(/\p{Emoji}/u)) {
        const emoji = SENTENCE_END_EMOJIS[randomInt(0, SENTENCE_END_EMOJIS.length - 1)];
        sentences[sentences.length - 1] = `${lastSentence} ${emoji}`;
        result = sentences.join(' ');
      }
    }
  }
  
  // Add emoji before call-to-action phrases (30% chance)
  const ctaPhrases = ['clique aqui', 'acesse', 'confira', 'veja mais', 'saiba mais'];
  for (const cta of ctaPhrases) {
    if (result.toLowerCase().includes(cta) && Math.random() < 0.3) {
      const emoji = CALL_TO_ACTION_EMOJIS[randomInt(0, CALL_TO_ACTION_EMOJIS.length - 1)];
      result = result.replace(new RegExp(`(${cta})`, 'gi'), `${emoji} $1`);
      break; // Only one CTA emoji per message
    }
  }
  
  // Add emoji after thank you phrases (30% chance)
  const thankPhrases = ['obrigado', 'obrigada', 'agradeço', 'grato', 'grata'];
  for (const thank of thankPhrases) {
    if (result.toLowerCase().includes(thank) && Math.random() < 0.3) {
      const emoji = THANK_YOU_EMOJIS[randomInt(0, THANK_YOU_EMOJIS.length - 1)];
      result = result.replace(new RegExp(`(${thank})`, 'gi'), `$1 ${emoji}`);
      break;
    }
  }
  
  return result;
}

// ─── Structural Variation ──────────────────────────────────────────────────────

const FILLER_WORDS = [
  ['então', ''],
  ['por isso', ''],
  ['assim', ''],
  ['pois', ''],
];

const PUNCTUATION_VARIATIONS: Array<[RegExp, string]> = [
  [/!/g, Math.random() > 0.5 ? '!' : '.'],
  [/\.\.\./g, Math.random() > 0.5 ? '...' : '.'],
];

/**
 * Apply random structural variations.
 * 
 * WARNING: Only use on messages designed for variation.
 * This may change the meaning slightly.
 */
export function applyStructuralVariation(text: string): string {
  let result = text;
  
  // Punctuation variation (50% chance)
  if (Math.random() < 0.5) {
    for (const [pattern, replacement] of PUNCTUATION_VARIATIONS) {
      if (Math.random() < 0.3) {
        result = result.replace(pattern, replacement);
      }
    }
  }
  
  return result;
}

// ─── Full Variation Pipeline ────────────────────────────────────────────────────

export interface VariationOptions {
  resolveSpintax?: boolean;
  addGreeting?: boolean;
  addEmoji?: boolean;
  structuralVariation?: boolean;
}

/**
 * Apply all enabled variations to a message.
 * Order: Spintax → Greeting → Emoji → Structural
 */
export function applyVariations(
  text: string,
  options: VariationOptions = {
    resolveSpintax: true,
    addGreeting: true,
    addEmoji: true,
    structuralVariation: false,
  }
): string {
  let result = text;
  
  // 1. Resolve spintax first (may contain greetings/emojis)
  if (options.resolveSpintax) {
    result = resolveSpintax(result);
  }
  
  // 2. Add greeting
  if (options.addGreeting) {
    result = addGreetingVariation(result);
  }
  
  // 3. Add emoji
  if (options.addEmoji) {
    result = addEmojiVariation(result);
  }
  
  // 4. Structural variation (optional, may change meaning)
  if (options.structuralVariation) {
    result = applyStructuralVariation(result);
  }
  
  return result;
}

// ─── Hash Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate a hash of the message for WhatsApp detection analysis.
 * Strips emojis and variations to find the "base" message.
 */
export function getMessageBaseHash(text: string): string {
  // Remove emojis
  const noEmoji = text.replace(/\p{Emoji}/gu, '');
  
  // Remove extra whitespace
  const normalized = noEmoji.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Simple hash
  return crypto.createHash('md5').update(normalized).digest('hex');
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}