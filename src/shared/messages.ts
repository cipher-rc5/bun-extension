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

// Standard error response shape returned by any failing handler.
export interface ErrorResponse {
  error: string;
}

// Standard success acknowledgement returned by side-effecting handlers.
export interface SuccessResponse {
  success: true;
}

// Tab metadata returned by getTabInfo on success.
export interface TabInfoResponse {
  tabId?: number;
  url?: string;
  title?: string;
}

// Discriminated union of every response passed back through sendResponse,
// mirroring ExtensionMessage. A wrong-shaped response is a compile error when
// sendResponse is typed against this union.
export type ExtensionResponse = TabInfoResponse | SuccessResponse | PageData | ErrorResponse;

// Typed sendResponse callback matching chrome's onMessage signature, narrowed
// to responses this extension actually returns.
export type SendResponse = (response: ExtensionResponse) => void;

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
