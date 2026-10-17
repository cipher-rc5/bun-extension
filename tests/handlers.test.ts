import { describe, expect, mock, test } from 'bun:test';
import { type BackgroundEffects, handleBackgroundMessage, handleContentMessage } from '../src/lib/handlers';
import type { PageData } from '../src/shared/messages';
import { deferred } from './support';
const page: PageData = { title: 'Example', url: 'https://example.test', wordCount: 42, linkCount: 3, imageCount: 1 };
function effects(): BackgroundEffects {
  return {
    counter: { get: async () => 10, increment: async () => 11, reset: async () => 0 },
    storeAnalysis: async () => {},
    setBadge: async () => {}
  };
}
describe('background acknowledgements', () => {
  test('tab 0 is a valid tab ID', async () => {
    expect(await handleBackgroundMessage({ action: 'getTabInfo' }, { tab: { id: 0, title: 'A' } }, effects())).toEqual({
      ok: true,
      action: 'getTabInfo',
      data: { tabId: 0, title: 'A', url: undefined }
    });
  });
  test('missing tab and wrong surface fail explicitly', async () => {
    expect((await handleBackgroundMessage({ action: 'updateBadge' }, {}, effects())).ok).toBe(false);
    expect((await handleBackgroundMessage({ action: 'getPageData' }, {}, effects())).ok).toBe(false);
  });
  test('waits for storage completion before success', async () => {
    const write = deferred<void>();
    const fx = effects();
    fx.storeAnalysis = () => write.promise;
    let replied = false;
    const result = handleBackgroundMessage({ action: 'pageAnalyzed', data: page }, { tab: { id: 2 } }, fx).then(r => {
      replied = true;
      return r;
    });
    await Promise.resolve();
    expect(replied).toBe(false);
    write.resolve();
    expect(await result).toEqual({ ok: true, action: 'pageAnalyzed', data: null });
  });
  test('storage and badge failures reach the caller', async () => {
    const fx = effects();
    fx.storeAnalysis = async () => {
      throw new Error('quota exceeded');
    };
    fx.setBadge = async () => {
      throw new Error('invalid tab');
    };
    expect(await handleBackgroundMessage({ action: 'pageAnalyzed', data: page }, { tab: { id: 1 } }, fx)).toEqual({
      ok: false,
      error: 'quota exceeded'
    });
    expect(await handleBackgroundMessage({ action: 'updateBadge' }, { tab: { id: 1 } }, fx)).toEqual({ ok: false, error: 'invalid tab' });
  });
  test('counter failures reach the caller', async () => {
    const fx = effects();
    fx.counter.get = async () => {
      throw new Error('offline');
    };
    expect(await handleBackgroundMessage({ action: 'getCounter' }, {}, fx)).toEqual({ ok: false, error: 'offline' });
  });
  test.each([['getCounter', 10], ['incrementCounter', 11], ['resetCounter', 0]] as const)(
    '%s returns authoritative count',
    async (action, count) => {
      expect(await handleBackgroundMessage({ action }, {}, effects())).toEqual({ ok: true, action, data: { count } });
    }
  );
});
describe('content effects', () => {
  test('analyzes, highlights, and scrolls', () => {
    const fx = { analyze: () => page, highlight: mock((_text: string) => {}), scrollToTop: mock(() => {}) };
    expect(handleContentMessage({ action: 'getPageData' }, fx)).toEqual({ ok: true, action: 'getPageData', data: page });
    expect(handleContentMessage({ action: 'highlightText', text: 'term' }, fx).ok).toBe(true);
    expect(fx.highlight).toHaveBeenCalledWith('term');
    expect(handleContentMessage({ action: 'scrollToTop' }, fx).ok).toBe(true);
    expect(fx.scrollToTop).toHaveBeenCalledTimes(1);
  });
  test('DOM failures and wrong surface fail explicitly', () => {
    const fx = {
      analyze: () => page,
      highlight: () => {
        throw new Error('not ready');
      },
      scrollToTop() {}
    };
    expect(handleContentMessage({ action: 'highlightText', text: 'x' }, fx)).toEqual({ ok: false, error: 'not ready' });
    expect(handleContentMessage({ action: 'getCounter' }, fx).ok).toBe(false);
  });
});
