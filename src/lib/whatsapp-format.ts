// Pure WhatsApp text formatting parser — no React imports, fully testable.

export type FormatSegment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'strikethrough'; content: string }
  | { type: 'monospace'; content: string }
  | { type: 'codeblock'; content: string }
  | { type: 'link'; url: string; display: string }
  | { type: 'linebreak' };

// Regex for a URL token
const URL_RE = /https?:\/\/[^\s]+/g;

// Regex for code block (```...```)
const CODEBLOCK_RE = /```([\s\S]*?)```/g;

// Inline format patterns — marker must NOT be followed/preceded by a space
// WhatsApp rule: marker is at word boundary (not mid-word, not surrounding spaces)
const BOLD_RE = /\*([^*\s][^*]*[^*\s]|\S)\*/g;
const ITALIC_RE = /_([^_\s][^_]*[^_\s]|\S)_/g;
const STRIKE_RE = /~([^~\s][^~]*[^~\s]|\S)~/g;
const MONO_RE = /`([^`\s][^`]*[^`\s]|\S)`/g;

/**
 * Parse a WhatsApp-formatted string into an array of renderable segments.
 * Processing order:
 *   1. Code blocks (``` ``` ```)  — highest priority, prevents inner parsing
 *   2. Inline formats (*bold*, _italic_, ~strike~, `mono`)
 *   3. URLs
 *   4. Line breaks
 */
export function parseWhatsAppFormat(text: string): FormatSegment[] {
  if (!text) return [];

  const segments: FormatSegment[] = [];

  // We'll walk through the string tracking position.
  // Each pass replaces matched regions with sentinel tokens so subsequent
  // passes don't re-process them.

  // Step 1: tokenize — collect all match spans with priority.
  // We collect: codeblocks first, then inline, then urls, then linebreaks.

  type Token = {
    start: number;
    end: number;
    segment: FormatSegment;
  };

  const tokens: Token[] = [];

  // Helper to add a token only if the range isn't already claimed.
  const covered = (start: number, end: number): boolean =>
    tokens.some(t => t.start < end && t.end > start);

  // 1a. Code blocks
  CODEBLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CODEBLOCK_RE.exec(text)) !== null) {
    const inner = m[1];
    if (inner.length === 0) continue; // skip empty ```  ```
    tokens.push({
      start: m.index,
      end: m.index + m[0].length,
      segment: { type: 'codeblock', content: inner },
    });
  }

  // 1b. Bold
  BOLD_RE.lastIndex = 0;
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (!covered(m.index, m.index + m[0].length)) {
      tokens.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { type: 'bold', content: m[1] },
      });
    }
  }

  // 1c. Italic
  ITALIC_RE.lastIndex = 0;
  while ((m = ITALIC_RE.exec(text)) !== null) {
    if (!covered(m.index, m.index + m[0].length)) {
      tokens.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { type: 'italic', content: m[1] },
      });
    }
  }

  // 1d. Strikethrough
  STRIKE_RE.lastIndex = 0;
  while ((m = STRIKE_RE.exec(text)) !== null) {
    if (!covered(m.index, m.index + m[0].length)) {
      tokens.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { type: 'strikethrough', content: m[1] },
      });
    }
  }

  // 1e. Monospace (single backtick — must not be inside a codeblock range)
  MONO_RE.lastIndex = 0;
  while ((m = MONO_RE.exec(text)) !== null) {
    if (!covered(m.index, m.index + m[0].length)) {
      tokens.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { type: 'monospace', content: m[1] },
      });
    }
  }

  // 1f. URLs
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (!covered(m.index, m.index + m[0].length)) {
      tokens.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { type: 'link', url: m[0], display: m[0] },
      });
    }
  }

  // Sort tokens by start position
  tokens.sort((a, b) => a.start - b.start);

  // Step 2: walk through the original text, emitting text/linebreak segments
  // between tokens.
  let cursor = 0;

  function emitText(raw: string) {
    if (!raw) return;
    // Split by newline characters
    const parts = raw.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        segments.push({ type: 'text', content: parts[i] });
      }
      if (i < parts.length - 1) {
        segments.push({ type: 'linebreak' });
      }
    }
  }

  for (const token of tokens) {
    if (token.start > cursor) {
      emitText(text.slice(cursor, token.start));
    }
    segments.push(token.segment);
    cursor = token.end;
  }

  // Emit any remaining text after the last token
  if (cursor < text.length) {
    emitText(text.slice(cursor));
  }

  return segments;
}

/**
 * Strip all WhatsApp formatting markers from text, returning plain string.
 * Useful for character/word counting without marker noise.
 */
export function stripWhatsAppFormat(text: string): string {
  if (!text) return '';
  return text
    // code blocks
    .replace(/```([\s\S]*?)```/g, '$1')
    // bold
    .replace(/\*([^*\s][^*]*[^*\s]|\S)\*/g, '$1')
    // italic
    .replace(/_([^_\s][^_]*[^_\s]|\S)_/g, '$1')
    // strikethrough
    .replace(/~([^~\s][^~]*[^~\s]|\S)~/g, '$1')
    // monospace
    .replace(/`([^`\s][^`]*[^`\s]|\S)`/g, '$1');
}

/**
 * Count characters in a WhatsApp message excluding formatting markers.
 */
export function countWhatsAppChars(text: string): number {
  return stripWhatsAppFormat(text).length;
}
