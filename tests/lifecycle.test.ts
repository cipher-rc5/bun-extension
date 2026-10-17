import { expect, mock, test } from 'bun:test';
import { ensureCleanupAlarm, runCleanup } from '../src/lib/lifecycle';
test('worker restarts preserve the existing alarm schedule', async () => {
  const existing = { name: 'cleanup', scheduledTime: 100000, periodInMinutes: 60 };
  const create = mock(async (_name: string, _info: chrome.alarms.AlarmCreateInfo) => {});
  const alarms = { get: async (_name: string) => existing, create };
  await ensureCleanupAlarm(alarms);
  await ensureCleanupAlarm(alarms);
  expect(create).toHaveBeenCalledTimes(0);
  expect(existing.scheduledTime).toBe(100000);
});
test('missing alarm is created and creation/read errors propagate', async () => {
  const create = mock(async (_name: string, _info: chrome.alarms.AlarmCreateInfo) => {});
  await ensureCleanupAlarm({ get: async () => undefined, create });
  expect(create).toHaveBeenCalledWith('cleanup', { periodInMinutes: 60 });
  await expect(ensureCleanupAlarm({
    get: async () => {
      throw new Error('read failed');
    },
    create
  })).rejects.toThrow('read failed');
  await expect(ensureCleanupAlarm({
    get: async () => undefined,
    create: async () => {
      throw new Error('alarm quota');
    }
  })).rejects.toThrow('alarm quota');
});
test('cleanup removes expired entries in one batch and preserves unrelated data', async () => {
  const remove = mock(async (_keys: string | string[]) => {});
  const now = 1_000_000_000;
  await runCleanup({
    get: async () => ({ temp_a: { timestamp: 1 }, temp_b: { timestamp: 2 }, temp_fresh: { timestamp: now }, saved: { timestamp: 1 } }),
    remove
  }, now);
  expect(remove).toHaveBeenCalledWith(['temp_a', 'temp_b']);
});
test('cleanup failures are observable and an empty batch makes no writes', async () => {
  const remove = mock(async (_keys: string | string[]) => {});
  await runCleanup({ get: async () => ({}), remove });
  expect(remove).toHaveBeenCalledTimes(0);
  await expect(runCleanup({
    get: async () => {
      throw new Error('disk');
    },
    remove
  })).rejects.toThrow('disk');
});
