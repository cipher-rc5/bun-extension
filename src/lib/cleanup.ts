// Pure cleanup predicate shared by the background script and its tests.

// Returns true iff `key` is a temp entry whose numeric `timestamp` is older
// than the TTL. Mirrors runCleanup's guard in src/background/index.ts.
export function shouldCleanup(key: string, value: unknown, now: number, ttlMs: number): boolean {
  return (key.startsWith('temp_') &&
    !!value &&
    typeof value === 'object' &&
    'timestamp' in value &&
    typeof (value as { timestamp: unknown }).timestamp === 'number' &&
    now - (value as { timestamp: number }).timestamp > ttlMs);
}
