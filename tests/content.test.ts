import { describe, expect, test } from 'bun:test';
import { countWords, createHighlightSplitter, escapeRegExp, splitForHighlight } from '../src/lib/text';

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

  test('preserves JavaScript whitespace semantics across repeated large inputs', () => {
    const whitespace =
      '\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
    const text = `${whitespace}one${whitespace}two${whitespace}`.repeat(10000);
    expect(countWords(text)).toBe(20000);
    expect(countWords('')).toBe(0);
    expect(countWords('zero\u200bwidth')).toBe(1);
    expect(countWords(text)).toBe(20000);
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

describe('splitForHighlight', () => {
  test('splits around a term with regex metacharacters', () => {
    const parts = splitForHighlight('x a(b) y a(b) z', 'a(b)');
    expect(parts).toEqual([{ text: 'x ', mark: false }, { text: 'a(b)', mark: true }, { text: ' y ', mark: false }, {
      text: 'a(b)',
      mark: true
    }, { text: ' z', mark: false }]);
  });

  test('matches case-insensitively while preserving original casing', () => {
    const parts = splitForHighlight('Hello WORLD hello', 'hello');
    expect(parts).toEqual([{ text: 'Hello', mark: true }, { text: ' WORLD ', mark: false }, { text: 'hello', mark: true }]);
  });

  test('no match returns a single plain part', () => {
    expect(splitForHighlight('nothing here', 'zzz')).toEqual([{ text: 'nothing here', mark: false }]);
  });

  test('empty term returns the whole text as a single plain part', () => {
    expect(splitForHighlight('some text', '')).toEqual([{ text: 'some text', mark: false }]);
  });

  test('whitespace-only term returns the whole text as a single plain part', () => {
    expect(splitForHighlight('some text', '   ')).toEqual([{ text: 'some text', mark: false }]);
  });

  test('term at the start yields no leading empty part', () => {
    expect(splitForHighlight('abc def', 'abc')).toEqual([{ text: 'abc', mark: true }, { text: ' def', mark: false }]);
  });
});

test('Unicode case folding preserves match markings', () => {
  expect(splitForHighlight('σ ς Σ', 'σ')).toEqual([{ text: 'σ', mark: true }, { text: ' ', mark: false }, { text: 'ς', mark: true }, {
    text: ' ',
    mark: false
  }, { text: 'Σ', mark: true }]);
});

test('reused highlight splitter resets between nodes and after a budget failure', () => {
  const split = createHighlightSplitter('σ');
  expect(split('Σ ς', 2)).toEqual(splitForHighlight('Σ ς', 'σ'));
  expect(() => split('σ σ σ', 2)).toThrow('Too many matches');
  expect(split('Σ', 1)).toEqual([{ text: 'Σ', mark: true }]);
  expect(split('plain', 0)).toBeNull();
  expect(() => split('σ', 0)).toThrow('Too many matches');
});
