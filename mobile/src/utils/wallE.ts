/** Strip wake-word «Валли» / Wall-E from spoken text. */
export function parseWallECommand(raw: string): { woke: boolean; command: string } {
  const text = (raw || '').trim();
  if (!text) return { woke: false, command: '' };

  const normalized = text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»""']/g, ' ')
    .replace(/[,.!?;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Common STT variants for «Валли»
  const wakePatterns = [
    /^валли\b\s*/,
    /^вали\b\s*/,
    /^валя\b\s*/,
    /^вольи\b\s*/,
    /^волли\b\s*/,
    /^wall[\s-]?e\b\s*/,
    /^walle\b\s*/,
    /^wali\b\s*/,
  ];

  for (const pattern of wakePatterns) {
    if (pattern.test(normalized)) {
      const command = normalized.replace(pattern, '').trim();
      return { woke: true, command };
    }
  }

  if (/\b(валли|вали|валя|вольи|волли|wali|walle|wall[\s-]?e)\b/.test(normalized)) {
    const command = normalized
      .replace(/\b(валли|вали|валя|вольи|волли|wali|walle|wall[\s-]?e)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { woke: true, command };
  }

  return { woke: false, command: text };
}

/** Heuristic: spoken phrase looks like an expense/income to record. */
export function looksLikeTransactionCommand(text: string): boolean {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return false;
  if (/\d/.test(t) && /(запиш|добав|потрат|купил|оплат|расход|доход|тенге|₸|\bна\b)/.test(t)) {
    return true;
  }
  // bare "2000 такси" / "две тысячи на еду" with digits
  return /\d{2,}/.test(t) && t.length <= 80;
}
