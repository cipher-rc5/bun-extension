// Pure decision logic for the onMessage handlers, extracted so response shaping
// and intended storage writes are unit-testable without chrome APIs. The real
// listeners call these and then perform the side effects.
import type { ExtensionMessage, ExtensionResponse, PageData } from '../shared/messages';

// A minimal view of chrome.runtime.MessageSender that the pure logic reads.
export interface SenderLike {
  tab?: { id?: number, url?: string, title?: string };
}

// Description of a badge update the caller should apply. Kept declarative so the
// pure function never touches chrome.action.
export interface BadgeUpdate {
  tabId: number;
  text: string;
  color: string;
}

// Description of a storage write the caller should apply.
export interface StorageWrite {
  key: string;
  value: unknown;
}

// Result of the pure background decision: the response to send plus any intended
// side effects for the real listener to carry out.
export interface BackgroundDecision {
  response: ExtensionResponse;
  badge?: BadgeUpdate;
  store?: StorageWrite;
}

// Decide the background response and side effects for a message. No chrome calls.
export function handleBackgroundMessage(request: ExtensionMessage, sender: SenderLike): BackgroundDecision {
  switch (request.action) {
    case 'getTabInfo':
      if (sender.tab) {
        return { response: { tabId: sender.tab.id, url: sender.tab.url, title: sender.tab.title } };
      }
      return { response: { error: 'no tab' } };

    case 'updateBadge':
      if (sender.tab?.id) {
        return {
          response: { success: true },
          badge: { tabId: sender.tab.id, text: request.text || '', color: request.color || '#3b82f6' }
        };
      }
      return { response: { error: 'no tab' } };

    case 'pageAnalyzed':
      return { response: { success: true }, store: { key: 'lastPageAnalysis', value: { data: request.data, timestamp: Date.now() } } };

    default:
      return { response: { error: 'unknown action' } };
  }
}

// Result of the pure content decision: the response to send (if any) plus any
// intended DOM effect for the real listener to carry out.
export interface ContentDecision {
  response?: ExtensionResponse;
  highlight?: string;
  scrollToTop?: boolean;
}

// Decide the content response and side effects for a message. No DOM/chrome calls.
// `analyze` supplies fresh page data for getPageData without this function
// touching the DOM.
export function handleContentMessage(request: ExtensionMessage, analyze: () => PageData): ContentDecision {
  switch (request.action) {
    case 'getPageData':
      return { response: analyze() };

    case 'highlightText':
      return { response: { success: true }, highlight: request.text };

    case 'scrollToTop':
      return { response: { success: true }, scrollToTop: true };

    default:
      return {};
  }
}
