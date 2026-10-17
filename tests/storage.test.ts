import { describe, expect, test } from 'bun:test';
import { createAnalysisWriter, createCounterStore, createQueue, type StorageArea } from '../src/lib/storage';
import { deferred } from './support';
function memory(initial: unknown = undefined): StorageArea & { items: Record<string, unknown> } {
  const items: Record<string, unknown> = initial === undefined ? {} : { count: initial };
  return {
    items,
    async get() {
      return { ...items };
    },
    async set(values) {
      Object.assign(items, values);
    }
  };
}
describe('serialized counter persistence', () => {
  test('hydrates existing count, serializes concurrent increments and reset', async () => {
    const storage = memory(10);
    const counter = createCounterStore(storage);
    expect(await counter.get()).toBe(10);
    expect(await Promise.all([counter.increment(), counter.increment(), counter.reset(), counter.increment()])).toEqual([11, 12, 0, 1]);
    expect(storage.items.count).toBe(1);
  });
  test('waits for hydration before increment and never writes a default over saved state', async () => {
    const read = deferred<Record<string, unknown>>();
    let saved: unknown;
    const counter = createCounterStore({
      get: () => read.promise,
      async set(value) {
        saved = value;
      }
    });
    const load = counter.get();
    const increment = counter.increment();
    await Promise.resolve();
    expect(saved).toBeUndefined();
    read.resolve({ count: 10 });
    expect(await load).toBe(10);
    expect(await increment).toBe(11);
    expect(saved).toEqual({ count: 11 });
  });
  test.each(['10', -1, NaN, Infinity, 1.5])('rejects corrupt count %s; explicit reset repairs it', async value => {
    const counter = createCounterStore(memory(value));
    await expect(counter.get()).rejects.toThrow('invalid');
    expect(await counter.reset()).toBe(0);
    expect(await counter.increment()).toBe(1);
  });
  test('propagates write failure, then recovers without optimistic state', async () => {
    const storage = memory(10);
    let fail = true;
    const original = storage.set;
    storage.set = async data => {
      if (fail) throw new Error('quota');
      await original(data);
    };
    const counter = createCounterStore(storage);
    await expect(counter.increment()).rejects.toThrow('quota');
    expect(storage.items.count).toBe(10);
    fail = false;
    expect(await counter.increment()).toBe(11);
  });
  test('defaults missing count without a write; rejects unsafe overflow', async () => {
    const storage = memory();
    expect(await createCounterStore(storage).get()).toBe(0);
    expect(storage.items.count).toBeUndefined();
    await expect(createCounterStore(memory(Number.MAX_SAFE_INTEGER)).increment()).rejects.toThrow('limit');
  });
  test('bounded queue rejects overload and accepts work after completion', async () => {
    const queue = createQueue(1);
    const gate = deferred<void>();
    const first = queue(() => gate.promise);
    await expect(queue(async () => 2)).rejects.toThrow('busy');
    gate.resolve();
    await first;
    expect(await queue(async () => 3)).toBe(3);
  });
});
describe('analysis persistence', () => {
  const page = (url: string) => ({ title: url, url, wordCount: 1, linkCount: 0, imageCount: 0 });
  test('flushes the newest trailing update and acknowledges after durable write', async () => {
    const gate = deferred<void>();
    const writes: Record<string, unknown>[] = [];
    const store = createAnalysisWriter({
      async get() {
        return {};
      },
      async set(value) {
        writes.push(value);
        if (writes.length === 1) await gate.promise;
      }
    }, () => 100);
    const first = store(page('/first'));
    let done = false;
    const middle = store(page('/middle'));
    const last = store(page('/latest')).then(() => {
      done = true;
    });
    expect(writes.length).toBe(1);
    expect(done).toBe(false);
    gate.resolve();
    await Promise.all([first, middle, last]);
    expect(writes).toEqual([{ lastPageAnalysis: { data: page('/first'), timestamp: 100 } }, {
      lastPageAnalysis: { data: page('/latest'), timestamp: 100 }
    }]);
    expect(done).toBe(true);
  });
  test('failed write is observable and later writes still run', async () => {
    let fail = true;
    const storage = memory();
    storage.set = async () => {
      if (fail) throw new Error('disk');
    };
    const store = createAnalysisWriter(storage);
    await expect(store(page('/a'))).rejects.toThrow('disk');
    fail = false;
    await store(page('/b'));
  });
  test('bounds waiting senders without dropping accepted trailing data', async () => {
    const gate = deferred<void>();
    const store = createAnalysisWriter(
      {
        async get() {
          return {};
        },
        set: () => gate.promise
      },
      Date.now,
      2
    );
    const first = store(page('/a'));
    const last = store(page('/b'));
    await expect(store(page('/c'))).rejects.toThrow('full');
    gate.resolve();
    await Promise.all([first, last]);
  });
});
