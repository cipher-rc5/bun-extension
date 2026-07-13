// Pure text helpers shared by the content script and its tests.

// Count whitespace-delimited words. Mirrors analyzePage in src/content/index.ts.
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Escape user-provided text before using it in a RegExp.
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Split `text` into ordered highlighted/plain parts around a case-insensitive
// literal `term`. Parts flagged `mark: true` matched the term. An empty or
// whitespace-only term yields a single plain part containing the whole text.
export function splitForHighlight(text: string, term: string): { text: string, mark: boolean }[] {
  if (!term.trim()) return [{ text, mark: false }];

  const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
  const lowerTerm = term.toLowerCase();

  return text.split(regex).filter(part => part.length > 0).map(part => ({ text: part, mark: part.toLowerCase() === lowerTerm }));
}
