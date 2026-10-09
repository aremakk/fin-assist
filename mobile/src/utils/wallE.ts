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

  // JavaScript's \b only treats ASCII letters as word characters, so it misses «Валли».
  const wakeAnywhere =
    /(?:^|\s)(?:валл?[иыея]|валя|вольи|волли|вал[\s-]?ли|wall[\s-]?e|walle|wali)(?=\s|$)/u;
  if (wakeAnywhere.test(normalized)) {
    const command = normalized
      .replace(wakeAnywhere, ' ')
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
  if (/\d/.test(t) && /(запиш|добав|потрат|купил|оплат|расход|доход|тенге|₸|(?:^|\s)на(?:\s|$))/.test(t)) {
    return true;
  }
  // bare "2000 такси" / "две тысячи на еду" with digits
  return /\d{2,}/.test(t) && t.length <= 80;
}

/**
 * Normalize voice/text for the assist API.
 * Older backends only create when they see «запиши» — prefix when missing.
 */
export function toAssistRecordMessage(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return text;
  if (!looksLikeTransactionCommand(text)) return text;
  if (/(запиш|добав)/i.test(text)) return text;
  return `запиши ${text}`;
}
