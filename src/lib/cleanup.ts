// Pure cleanup predicate shared by the background script and its tests.

// Returns true iff `key` is a temp entry whose numeric `timestamp` is older
// than the TTL. Used by runCleanup in src/lib/lifecycle.ts.
export function shouldCleanup(key: string, value: unknown, now: number, ttlMs: number): boolean {
  return (key.startsWith('temp_') &&
    !!value &&
    typeof value === 'object' &&
    'timestamp' in value &&
    typeof (value as { timestamp: unknown }).timestamp === 'number' &&
    Number.isFinite((value as { timestamp: number }).timestamp) &&
    now - (value as { timestamp: number }).timestamp > ttlMs);
}
