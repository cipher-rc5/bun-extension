/** Count whitespace-delimited words without allocating token arrays. */
export function countWords(text: string): number {
  const words = /\S+/g;
  let count = 0;
  while (words.test(text)) count++;
  return count;
}

// Escape user-provided text before using it in a RegExp.
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Reuse one literal matcher across text nodes and stop at the match budget. */
export function createHighlightSplitter(term: string) {
  const matcher = term.trim() ? new RegExp(escapeRegExp(term), 'gi') : null;
  return (text: string, limit = Infinity): { text: string, mark: boolean }[] => {
    if (!matcher) return [{ text, mark: false }];
    matcher.lastIndex = 0;
    const parts: { text: string, mark: boolean }[] = [];
    let end = 0;
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(text))) {
      if (++count > limit) throw new Error('Too many matches; use a longer search');
      if (match.index > end) parts.push({ text: text.slice(end, match.index), mark: false });
      parts.push({ text: match[0], mark: true });
      end = matcher.lastIndex;
    }
    if (end < text.length) parts.push({ text: text.slice(end), mark: false });
    return parts;
  };
}

/** Split case-insensitive literal matches, preserving their original casing. */
export function splitForHighlight(text: string, term: string): { text: string, mark: boolean }[] {
  return createHighlightSplitter(term)(text);
}
