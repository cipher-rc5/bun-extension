import { describe, expect, test } from 'bun:test';
import { type ExtensionResponse, isResponse, type PageData, parseMessage, routeAction, success } from '../src/shared/messages';
describe('message boundary', () => {
  test('routes every action to the correct surface', () => {
    for (const action of ['getTabInfo', 'updateBadge', 'pageAnalyzed', 'getCounter', 'incrementCounter', 'resetCounter']) {
      expect(routeAction(action)).toBe('background');
    }
    for (const action of ['getPageData', 'highlightText', 'scrollToTop']) expect(routeAction(action)).toBe('content');
    expect(routeAction('unknown')).toBe('unknown');
  });
  test.each(
    [null, [], 42, {}, { action: 'unknown' }, { action: 'highlightText' }, { action: 'highlightText', text: 'x'.repeat(1001) }, {
      action: 'pageAnalyzed',
      data: {}
    }, { action: 'updateBadge', color: 'bad' }].map(value => ({ value }))
  )('rejects malformed request %j', ({ value }) => {
    expect(parseMessage(value)).toBeNull();
  });
  test('accepts valid payloads and strips unrecognized fields', () => {
    expect(parseMessage({ action: 'getCounter', extra: true })).toEqual({ action: 'getCounter' });
    expect(parseMessage({ action: 'highlightText', text: 'a(b)' })).toEqual({ action: 'highlightText', text: 'a(b)' });
    expect(parseMessage({ action: 'updateBadge', color: '#123aBc', text: '1' })).not.toBeNull();
  });
  test('rejects empty, wrong-action, and corrupt replies', () => {
    for (
      const value of [{}, { ok: true, action: 'getCounter', data: {} }, { ok: true, action: 'resetCounter', data: { count: 0 } }, {
        ok: true,
        action: 'getCounter',
        data: { count: NaN }
      }, { ok: false, error: '' }]
    ) expect(isResponse('getCounter', value)).toBe(false);
    expect(isResponse('getCounter', success('getCounter', { count: 10 }))).toBe(true);
    expect(isResponse('getCounter', { ok: false, error: 'quota' })).toBe(true);
  });
});
// Compile-time regressions: no suppression comments or deliberate runtime exceptions.
type Assert<T extends true> = T;
export type EmptyReplyRejected = Assert<{} extends ExtensionResponse ? false : true>;
export type WrongActionDataRejected = Assert<{ ok: true, action: 'getCounter', data: PageData } extends ExtensionResponse ? false : true>;
