import { describe, expect, test } from 'bun:test';
import { routeAction } from '../src/shared/messages';

describe('routeAction', () => {
  test('background-handled actions map to background', () => {
    expect(routeAction('getTabInfo')).toBe('background');
    expect(routeAction('updateBadge')).toBe('background');
    expect(routeAction('pageAnalyzed')).toBe('background');
  });

  test('content-handled actions map to content', () => {
    expect(routeAction('getPageData')).toBe('content');
    expect(routeAction('highlightText')).toBe('content');
    expect(routeAction('scrollToTop')).toBe('content');
  });

  test('unknown action falls through to unknown', () => {
    expect(routeAction('openPopup')).toBe('unknown');
    expect(routeAction('')).toBe('unknown');
    expect(routeAction('nope')).toBe('unknown');
  });
});
