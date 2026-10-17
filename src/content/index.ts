import { handleContentMessage } from '../lib/handlers';
import { applyHighlight, clearHighlights } from '../lib/highlight';
import { observeNavigation } from '../lib/navigation';
import { countWords } from '../lib/text';
import { failure, type PageData, parseMessage, routeAction, sendBackground } from '../shared/messages';
function analyzePage(): PageData {
  const body = document.body;
  return {
    title: document.title.slice(0, 4096),
    url: window.location.href.slice(0, 32768),
    wordCount: countWords(body?.innerText ?? ''),
    linkCount: body?.querySelectorAll('a[href]').length ?? 0,
    imageCount: body?.querySelectorAll('img').length ?? 0
  };
}
chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  const request = parseMessage(value);
  if (sender.id !== chrome.runtime.id || !request || routeAction(request.action) !== 'content') {
    sendResponse(failure(new Error('Invalid content message')));
    return false;
  }
  sendResponse(handleContentMessage(request, {
    analyze: analyzePage,
    highlight(text) {
      if (!document.body) throw new Error('Page is not ready');
      clearHighlights(document.body);
      applyHighlight(document.body, text);
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }));
  return false;
});
function sendPageData() {
  void sendBackground({ action: 'pageAnalyzed', data: analyzePage() }).catch(error => {
    console.warn('Content: page analysis could not be saved:', error instanceof Error ? error.message : 'Operation failed');
  });
}
// document_idle normally has a body. Body-less documents should not retain observers.
if (document.body) {
  sendPageData();
  observeNavigation(window, sendPageData);
}
