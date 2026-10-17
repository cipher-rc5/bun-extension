/** Internal protocol. Success replies are correlated with the request action. */
export interface PageData {
  title: string;
  url: string;
  wordCount: number;
  linkCount: number;
  imageCount: number;
}
interface Payloads {
  getTabInfo: Record<never, never>;
  updateBadge: { text?: string, color?: string };
  pageAnalyzed: { data: PageData };
  getCounter: Record<never, never>;
  incrementCounter: Record<never, never>;
  resetCounter: Record<never, never>;
  getPageData: Record<never, never>;
  highlightText: { text: string };
  scrollToTop: Record<never, never>;
}
export interface ResponseData {
  getTabInfo: { tabId: number, url?: string, title?: string };
  updateBadge: null;
  pageAnalyzed: null;
  getCounter: { count: number };
  incrementCounter: { count: number };
  resetCounter: { count: number };
  getPageData: PageData;
  highlightText: null;
  scrollToTop: null;
}
export type MessageAction = keyof Payloads;
export type Message<A extends MessageAction> = { [K in A]: { action: K } & Payloads[K] }[A];
export type ExtensionMessage = Message<MessageAction>;
export type ContentAction = 'getPageData' | 'highlightText' | 'scrollToTop';
export type BackgroundAction = Exclude<MessageAction, ContentAction>;
export type SuccessResponse<A extends MessageAction> = { [K in A]: { ok: true, action: K, data: ResponseData[K] } }[A];
export type ErrorResponse = { ok: false, error: string };
export type ExtensionResponse<A extends MessageAction = MessageAction> = SuccessResponse<A> | ErrorResponse;
export type SendResponse = (response: ExtensionResponse) => void;

export function success<A extends MessageAction>(action: A, data: NoInfer<ResponseData[A]>): SuccessResponse<A> {
  // Construction is checked at call sites; the mapped union retains correlation.
  return { ok: true, action, data } as SuccessResponse<A>;
}
export function failure(error: unknown): ErrorResponse {
  return { ok: false, error: error instanceof Error && error.message ? error.message : 'Operation failed' };
}
export type MessageHandler = 'background' | 'content' | 'unknown';
export function routeAction(action: string): MessageHandler {
  switch (action) {
    case 'getTabInfo':
    case 'updateBadge':
    case 'pageAnalyzed':
    case 'getCounter':
    case 'incrementCounter':
    case 'resetCounter':
      return 'background';
    case 'getPageData':
    case 'highlightText':
    case 'scrollToTop':
      return 'content';
    default:
      return 'unknown';
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}
export function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
export function isPageData(value: unknown): value is PageData {
  return record(value) && boundedString(value.title, 4096) && boundedString(value.url, 32768) &&
    isCount(value.wordCount) && isCount(value.linkCount) && isCount(value.imageCount);
}
/** Validate Chrome's untyped serialization boundary before dispatching. */
export function parseMessage(value: unknown): ExtensionMessage | null {
  if (!record(value)) return null;
  switch (value.action) {
    case 'getTabInfo':
    case 'getCounter':
    case 'incrementCounter':
    case 'resetCounter':
    case 'getPageData':
    case 'scrollToTop':
      return { action: value.action };
    case 'highlightText':
      return boundedString(value.text, 1000) ? { action: value.action, text: value.text } : null;
    case 'pageAnalyzed':
      return isPageData(value.data) ? { action: value.action, data: value.data } : null;
    case 'updateBadge': {
      if (value.text !== undefined && !boundedString(value.text, 100)) return null;
      if (value.color !== undefined && (typeof value.color !== 'string' || !/^#[\da-f]{6}$/i.test(value.color))) return null;
      return { action: value.action, text: value.text as string | undefined, color: value.color as string | undefined };
    }
    default:
      return null;
  }
}
export function isResponse<A extends MessageAction>(action: A, value: unknown): value is ExtensionResponse<A> {
  if (!record(value)) return false;
  if (value.ok === false) return typeof value.error === 'string' && value.error.length > 0;
  if (value.ok !== true || value.action !== action) return false;
  switch (action) {
    case 'getCounter':
    case 'incrementCounter':
    case 'resetCounter':
      return record(value.data) && isCount(value.data.count);
    case 'getPageData':
      return isPageData(value.data);
    case 'getTabInfo':
      return record(value.data) && isCount(value.data.tabId) &&
        (value.data.url === undefined || typeof value.data.url === 'string') &&
        (value.data.title === undefined || typeof value.data.title === 'string');
    default:
      return value.data === null;
  }
}
/** Popup/content → background. Content actions instead use chrome.tabs.sendMessage. */
export async function sendBackground<A extends BackgroundAction>(request: Message<A>): Promise<ResponseData[A]> {
  const response: unknown = await chrome.runtime.sendMessage(request);
  if (!isResponse(request.action, response)) throw new Error('Invalid response from extension');
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
