import { describe, expect, test } from 'bun:test';
import { shouldCleanup } from '../src/lib/cleanup';

describe('shouldCleanup predicate', () => {
  const now = 1_000_000_000_000;
  const ttlMs = 24 * 60 * 60 * 1000;

  test('fresh temp entry is not cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: now - 1000 }, now, ttlMs)).toBe(false);
  });

  test('old temp entry is cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: now - ttlMs - 1 }, now, ttlMs)).toBe(true);
  });

  test('entry exactly at the TTL boundary is not cleaned', () => {
    expect(shouldCleanup('temp_a', { timestamp: now - ttlMs }, now, ttlMs)).toBe(false);
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

  test('temp key with a non-object value is not cleaned', () => {
    expect(shouldCleanup('temp_a', 12345, now, ttlMs)).toBe(false);
  });
});
