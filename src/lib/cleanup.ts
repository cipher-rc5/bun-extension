/** Expire temp_* entries with finite timestamps strictly older than the TTL. */
export function shouldCleanup(key: string, value: unknown, now: number, ttlMs: number): boolean {
  return (key.startsWith('temp_') &&
    !!value &&
    typeof value === 'object' &&
    'timestamp' in value &&
    typeof (value as { timestamp: unknown }).timestamp === 'number' &&
    Number.isFinite((value as { timestamp: number }).timestamp) &&
    now - (value as { timestamp: number }).timestamp > ttlMs);
}
