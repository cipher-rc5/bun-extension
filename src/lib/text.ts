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

export interface HighlightPart {
  text: string;
  mark: boolean;
}

/** Reuse one matcher; return null without allocating parts when nothing matches. */
export function createHighlightSplitter(term: string) {
  const matcher = term.trim() ? new RegExp(escapeRegExp(term), 'gi') : null;
  return (text: string, limit = Infinity): HighlightPart[] | null => {
    if (!matcher) return null;
    matcher.lastIndex = 0;
    let parts: HighlightPart[] | null = null;
    let end = 0;
    let count = 0;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(text))) {
      if (++count > limit) throw new Error('Too many matches; use a longer search');
      parts ??= [];
      if (match.index > end) parts.push({ text: text.slice(end, match.index), mark: false });
      parts.push({ text: match[0], mark: true });
      end = matcher.lastIndex;
    }
    if (parts && end < text.length) parts.push({ text: text.slice(end), mark: false });
    return parts;
  };
}

/** Split case-insensitive literal matches, preserving their original casing. */
export function splitForHighlight(text: string, term: string): HighlightPart[] {
  if (!term.trim()) return [{ text, mark: false }];
  return createHighlightSplitter(term)(text) ?? (text ? [{ text, mark: false }] : []);
}
