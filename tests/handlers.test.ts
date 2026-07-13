import { describe, expect, test } from 'bun:test';
import { handleBackgroundMessage, handleContentMessage } from '../src/lib/handlers';
import type { PageData } from '../src/shared/messages';

const samplePage: PageData = { title: 'Example', url: 'https://example.com', wordCount: 42, linkCount: 3, imageCount: 1 };

describe('handleBackgroundMessage', () => {
  test('getTabInfo with a tab returns tab metadata', () => {
    const decision = handleBackgroundMessage({ action: 'getTabInfo' }, { tab: { id: 7, url: 'https://a.test', title: 'A' } });
    expect(decision.response).toEqual({ tabId: 7, url: 'https://a.test', title: 'A' });
    expect(decision.badge).toBeUndefined();
    expect(decision.store).toBeUndefined();
  });

  test('getTabInfo without a tab returns an error', () => {
    const decision = handleBackgroundMessage({ action: 'getTabInfo' }, {});
    expect(decision.response).toEqual({ error: 'no tab' });
  });

  test('updateBadge with a tab id returns success and a badge update', () => {
    const decision = handleBackgroundMessage({ action: 'updateBadge', text: '9', color: '#ff0000' }, { tab: { id: 3 } });
    expect(decision.response).toEqual({ success: true });
    expect(decision.badge).toEqual({ tabId: 3, text: '9', color: '#ff0000' });
  });

  test('updateBadge falls back to defaults for missing text/color', () => {
    const decision = handleBackgroundMessage({ action: 'updateBadge' }, { tab: { id: 5 } });
    expect(decision.badge).toEqual({ tabId: 5, text: '', color: '#3b82f6' });
  });

  test('updateBadge without a tab id returns an error and no badge', () => {
    const decision = handleBackgroundMessage({ action: 'updateBadge', text: 'x' }, {});
    expect(decision.response).toEqual({ error: 'no tab' });
    expect(decision.badge).toBeUndefined();
  });

  test('pageAnalyzed returns success and a storage write', () => {
    const decision = handleBackgroundMessage({ action: 'pageAnalyzed', data: samplePage }, { tab: { id: 1 } });
    expect(decision.response).toEqual({ success: true });
    expect(decision.store).toBeDefined();
    expect(decision.store!.key).toBe('lastPageAnalysis');
    const value = decision.store!.value as { data: PageData, timestamp: number };
    expect(value.data).toEqual(samplePage);
    expect(typeof value.timestamp).toBe('number');
  });

  test('unknown action returns an error response', () => {
    const decision = handleBackgroundMessage(
      // Cast: the union does not include this action, but the runtime default must handle it.
      { action: 'openPopup' } as unknown as Parameters<typeof handleBackgroundMessage>[0],
      {}
    );
    expect(decision.response).toEqual({ error: 'unknown action' });
  });
});

describe('handleContentMessage', () => {
  test('getPageData returns the analyzed page as the response', () => {
    const decision = handleContentMessage({ action: 'getPageData' }, () => samplePage);
    expect(decision.response).toEqual(samplePage);
    expect(decision.highlight).toBeUndefined();
    expect(decision.scrollToTop).toBeUndefined();
  });

  test('highlightText returns success and the highlight term', () => {
    const decision = handleContentMessage({ action: 'highlightText', text: 'quick' }, () => samplePage);
    expect(decision.response).toEqual({ success: true });
    expect(decision.highlight).toBe('quick');
  });

  test('scrollToTop returns success and a scroll flag', () => {
    const decision = handleContentMessage({ action: 'scrollToTop' }, () => samplePage);
    expect(decision.response).toEqual({ success: true });
    expect(decision.scrollToTop).toBe(true);
  });

  test('unknown action yields no response and no side effects', () => {
    const decision = handleContentMessage({ action: 'nope' } as unknown as Parameters<typeof handleContentMessage>[0], () => samplePage);
    expect(decision.response).toBeUndefined();
    expect(decision.highlight).toBeUndefined();
    expect(decision.scrollToTop).toBeUndefined();
  });
});
