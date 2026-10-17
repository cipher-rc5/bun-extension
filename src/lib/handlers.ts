import { type ExtensionMessage, type ExtensionResponse, failure, type PageData, success } from '../shared/messages';
export interface SenderLike {
  tab?: { id?: number, url?: string, title?: string };
}
export interface BackgroundEffects {
  counter: { get(): Promise<number>, increment(): Promise<number>, reset(): Promise<number> };
  storeAnalysis(data: PageData): Promise<void>;
  setBadge(tabId: number, text: string, color: string): Promise<void>;
}
/** Reply after effects complete; convert failures to protocol errors. */
export async function handleBackgroundMessage(
  request: ExtensionMessage,
  sender: SenderLike,
  effects: BackgroundEffects
): Promise<ExtensionResponse> {
  try {
    switch (request.action) {
      case 'getTabInfo': {
        const tab = sender.tab;
        if (tab?.id === undefined) throw new Error('No sender tab');
        return success(request.action, { tabId: tab.id, url: tab.url, title: tab.title });
      }
      case 'updateBadge':
        if (sender.tab?.id === undefined) throw new Error('No sender tab');
        await effects.setBadge(sender.tab.id, request.text ?? '', request.color ?? '#3b82f6');
        return success(request.action, null);
      case 'pageAnalyzed':
        if (sender.tab?.id === undefined) throw new Error('No sender tab');
        await effects.storeAnalysis(request.data);
        return success(request.action, null);
      case 'getCounter':
        return success(request.action, { count: await effects.counter.get() });
      case 'incrementCounter':
        return success(request.action, { count: await effects.counter.increment() });
      case 'resetCounter':
        return success(request.action, { count: await effects.counter.reset() });
      default:
        return failure(new Error('Action must be sent to a content script'));
    }
  } catch (error) {
    return failure(error);
  }
}
export interface ContentEffects {
  analyze(): PageData;
  highlight(text: string): void;
  scrollToTop(): void;
}
export function handleContentMessage(request: ExtensionMessage, effects: ContentEffects): ExtensionResponse {
  try {
    switch (request.action) {
      case 'getPageData':
        return success(request.action, effects.analyze());
      case 'highlightText':
        effects.highlight(request.text);
        return success(request.action, null);
      case 'scrollToTop':
        effects.scrollToTop();
        return success(request.action, null);
      default:
        return failure(new Error('Action must be sent to the background worker'));
    }
  } catch (error) {
    return failure(error);
  }
}
