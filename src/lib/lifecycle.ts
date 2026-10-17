import { shouldCleanup } from './cleanup';
export const CLEANUP_ALARM = 'cleanup';
export interface AlarmScheduler {
  get(name: string): Promise<{ name: string } | undefined>;
  create(name: string, info: { periodInMinutes: number }): Promise<void>;
}
/** Recreating an alarm resets its deadline; preserve an existing schedule. */
export async function ensureCleanupAlarm(alarms: AlarmScheduler): Promise<void> {
  if (!await alarms.get(CLEANUP_ALARM)) await alarms.create(CLEANUP_ALARM, { periodInMinutes: 60 });
}
export async function runCleanup(storage: Pick<typeof chrome.storage.local, 'get' | 'remove'>, now = Date.now()): Promise<void> {
  const items = await storage.get(null);
  const expired = Object.keys(items).filter(key => shouldCleanup(key, items[key], now, 24 * 60 * 60 * 1000));
  if (expired.length) await storage.remove(expired);
}
