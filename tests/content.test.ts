import { describe, expect, test } from 'bun:test';

// Pure re-implementation of the word-counting logic in analyzePage
// (src/content/index.ts). Mirrors:
//   text.trim().split(/\s+/).filter(word => word.length > 0).length
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Pure re-implementation of the highlight escape helper in
// src/content/index.ts. Guards the highlight RegExp against
// user-supplied metacharacters.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('word counting logic', () => {
  test('empty string yields 0', () => {
    expect(countWords('')).toBe(0);
  });

  test('whitespace-only string yields 0', () => {
    expect(countWords('   \t\n  ')).toBe(0);
  });

  test('single word yields 1', () => {
    expect(countWords('hello')).toBe(1);
  });

  test('single word with surrounding whitespace yields 1', () => {
    expect(countWords('  hello  ')).toBe(1);
  });

  test('multiple words separated by single spaces', () => {
    expect(countWords('the quick brown fox')).toBe(4);
  });

  test('multiple consecutive spaces do not inflate the count', () => {
    expect(countWords('the   quick    brown')).toBe(3);
  });

  test('mixed whitespace (tabs and newlines) counts correctly', () => {
    expect(countWords('one\ttwo\nthree   four')).toBe(4);
  });
});

describe('escapeRegExp highlight guard', () => {
  test('escapes parentheses so the RegExp does not throw', () => {
    const term = 'a(b)';
    expect(() => new RegExp(`(${escapeRegExp(term)})`, 'gi')).not.toThrow();
  });

  test('escaped parentheses term matches literally', () => {
    const term = 'a(b)';
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    expect(regex.test('found a(b) here')).toBe(true);
  });

  test('escaped parentheses term does not match its regex meaning', () => {
    const term = 'a(b)';
    const regex = new RegExp(escapeRegExp(term), 'gi');
    // Without escaping, "a(b)" as a regex would match a bare "ab".
    expect(regex.test('ab')).toBe(false);
  });

  test('escapes the star metacharacter so the RegExp does not throw', () => {
    const term = 'c*';
    expect(() => new RegExp(`(${escapeRegExp(term)})`, 'gi')).not.toThrow();
  });

  test('escaped star term matches literally', () => {
    const term = 'c*';
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    expect(regex.test('a c* b')).toBe(true);
  });

  test('escaped star term does not match its regex meaning', () => {
    const term = 'c*';
    const regex = new RegExp(`^${escapeRegExp(term)}$`, 'gi');
    // Without escaping, "c*" as a regex would match "ccc".
    expect(regex.test('ccc')).toBe(false);
  });
});
