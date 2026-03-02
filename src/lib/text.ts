/**
 * Normalize script text into one paragraph (no line breaks),
 * then split on sentence-ending punctuation (.!?) into individual lines.
 */
export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  // Split after sentence-ending punctuation followed by a space
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If no sentence boundaries found, return the whole text as one line
  return sentences.length > 0 ? sentences : [normalized];
}
