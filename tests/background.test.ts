import { describe, expect, test } from 'bun:test';

// Pure re-implementation of the cleanup predicate in runCleanup
// (src/background/index.ts). Returns true iff the key is a temp entry
// whose numeric timestamp is older than the TTL.
function shouldCleanup(key: string, value: unknown, now: number, ttlMs: number): boolean {
  return (key.startsWith('temp_') &&
    !!value &&
    typeof value === 'object' &&
    'timestamp' in value &&
    typeof (value as { timestamp: unknown }).timestamp === 'number' &&
    now - (value as { timestamp: number }).timestamp > ttlMs);
}

describe('shouldCleanup predicate', () => {
  const now = 1_000_000_000_000;
  const ttlMs = 24 * 60 * 60 * 1000;

  test('fresh temp entry is not cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: now - 1000 }, now, ttlMs)).toBe(false);
  });

  test('old temp entry is cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: now - ttlMs - 1 }, now, ttlMs)).toBe(true);
  });

  test('non-temp key is not cleaned even when old', () => {
    expect(shouldCleanup('data_a', { timestamp: now - ttlMs - 1 }, now, ttlMs)).toBe(false);
  });

  test('temp key without a timestamp is not cleaned', () => {
    expect(shouldCleanup('temp_a', { value: 42 }, now, ttlMs)).toBe(false);
  });

  test('temp key with a non-numeric timestamp is not cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: 'old' }, now, ttlMs)).toBe(false);
  });

  test('temp key with a null value is not cleaned', () => {
    expect(shouldCleanup('temp_a', null, now, ttlMs)).toBe(false);
  });
});
