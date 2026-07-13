// Shared, typed message contract passed between popup/content/background.

// Data produced by the content script's page analysis.
export interface PageData {
  title: string;
  url: string;
  wordCount: number;
  linkCount: number;
  imageCount: number;
}

// Discriminated union of every message sent across the extension.
export type ExtensionMessage =
  | { action: 'getTabInfo' }
  | { action: 'updateBadge', text?: string, color?: string }
  | { action: 'getPageData' }
  | { action: 'highlightText', text: string }
  | { action: 'scrollToTop' }
  | { action: 'pageAnalyzed', data: PageData };

// String-literal union of all valid message actions.
export type MessageAction = ExtensionMessage['action'];

// Which surface handles a given action. Pure and importable so the routing
// decision can be unit-tested without chrome/DOM. Unknown actions fall through
// to 'unknown'.
export type MessageHandler = 'background' | 'content' | 'unknown';

export function routeAction(action: string): MessageHandler {
  switch (action) {
    case 'getTabInfo':
    case 'updateBadge':
    case 'pageAnalyzed':
      return 'background';
    case 'getPageData':
    case 'highlightText':
    case 'scrollToTop':
      return 'content';
    default:
      return 'unknown';
  }
}
