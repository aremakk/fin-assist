/** Strip wake-word «Валли» / Wall-E from spoken text. */
export function parseWallECommand(raw: string): { woke: boolean; command: string } {
  const text = (raw || '').trim();
  if (!text) return { woke: false, command: '' };

  const normalized = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»""]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wakePatterns = [
    /^валли\b[,.\s!:-]*/,
    /^wall[\s-]?e\b[,.\s!:-]*/,
    /^walle\b[,.\s!:-]*/,
    /^вали\b[,.\s!:-]*/, // common STT misspelling
  ];

  for (const pattern of wakePatterns) {
    if (pattern.test(normalized)) {
      const command = normalized.replace(pattern, '').trim();
      return { woke: true, command };
    }
  }

  // wake word somewhere in the phrase
  if (/\bвалли\b|\bвали\b|\bwall[\s-]?e\b|\bwalle\b/.test(normalized)) {
    const command = normalized
      .replace(/\bвалли\b|\bвали\b|\bwall[\s-]?e\b|\bwalle\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { woke: true, command };
  }

  return { woke: false, command: text };
}
