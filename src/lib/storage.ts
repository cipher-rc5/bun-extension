import { isCount, type PageData } from '../shared/messages';
export interface StorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}
/** Bounded serialization; a failed operation cannot poison the queue. */
export function createQueue(limit = 128) {
  let tail = Promise.resolve();
  let pending = 0;
  return <T>(operation: () => Promise<T>): Promise<T> => {
    if (pending >= limit) return Promise.reject(new Error('Extension busy; please try again'));
    pending++;
    const result = tail.then(operation).finally(() => {
      pending--;
    });
    tail = result.then(() => {}, () => {});
    return result;
  };
}
/** Background-owned writer serializes counter operations from all popup windows. */
export function createCounterStore(storage: StorageArea) {
  const queue = createQueue();
  const read = async () => {
    const { count } = await storage.get('count');
    if (count === undefined) return 0;
    if (!isCount(count)) throw new Error('Saved counter is invalid; reset it to continue');
    return count;
  };
  return {
    get: () => queue(read),
    increment: () =>
      queue(async () => {
        const count = await read();
        if (count === Number.MAX_SAFE_INTEGER) throw new Error('Counter limit reached');
        await storage.set({ count: count + 1 });
        return count + 1;
      }),
    reset: () =>
      queue(async () => {
        await storage.set({ count: 0 });
        return 0;
      })
  };
}
/** Coalesce only during a write; there is no timer to outlive the MV3 event. */
export function createAnalysisWriter(storage: StorageArea, now = Date.now, limit = 128) {
  type Waiter = { resolve: () => void, reject: (error: unknown) => void };
  let pending: { data: PageData, waiters: Waiter[] } | undefined;
  let running = false;
  let waiting = 0;
  const flush = async () => {
    running = true;
    while (pending) {
      const batch = pending;
      pending = undefined;
      try {
        await storage.set({ lastPageAnalysis: { data: batch.data, timestamp: now() } });
        for (const waiter of batch.waiters) waiter.resolve();
      } catch (error) {
        for (const waiter of batch.waiters) waiter.reject(error);
      } finally {
        waiting -= batch.waiters.length;
      }
    }
    running = false;
  };
  return (data: PageData): Promise<void> => {
    if (waiting >= limit) return Promise.reject(new Error('Analysis queue is full'));
    waiting++;
    return new Promise((resolve, reject) => {
      if (pending) {
        pending.data = data;
        pending.waiters.push({ resolve, reject });
      } else pending = { data, waiters: [{ resolve, reject }] };
      if (!running) void flush();
    });
  };
}
