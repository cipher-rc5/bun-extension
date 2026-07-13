// Content script that runs on web pages
import { handleContentMessage } from '../lib/handlers';
import { applyHighlight, clearHighlights } from '../lib/highlight';
import { countWords } from '../lib/text';
import type { ExtensionMessage, PageData, SendResponse } from '../shared/messages';

const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

log('Content script loaded on:', window.location.href);

function getBodyOrWarn(): HTMLElement | null {
  const body = document.body;
  if (!body) {
    console.warn('Content script: document.body not ready yet.');
  }
  return body;
}

// Analyze the current page
function analyzePage(): PageData {
  const body = getBodyOrWarn();
  const title = document.title;
  const url = window.location.href;

  if (!body) {
    return { title, url, wordCount: 0, linkCount: 0, imageCount: 0 };
  }

  // Count words in visible text
  const textContent = body.innerText || '';
  const wordCount = countWords(textContent);

  // Count links and images
  const linkCount = body.querySelectorAll('a[href]').length;
  const imageCount = body.querySelectorAll('img').length;

  return { title, url, wordCount, linkCount, imageCount };
}

// Send page data to background script
function sendPageData() {
  const pageData = analyzePage();

  const message: ExtensionMessage = { action: 'pageAnalyzed', data: pageData };
  chrome.runtime.sendMessage(message, () => {
    if (chrome.runtime.lastError) {
      // Surface genuine send failures; normal operation stays quiet.
      console.warn('Content script: failed to send pageAnalyzed:', chrome.runtime.lastError.message);
    }
  });
}

// Listen for messages from popup or background. The listener stays a thin
// wrapper: handleContentMessage shapes the response, we perform DOM side effects.
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender, sendResponse: SendResponse) => {
  log('Content script received message:', request);

  const decision = handleContentMessage(request, analyzePage);

  if (decision.highlight !== undefined) {
    highlightText(decision.highlight);
  }

  if (decision.scrollToTop) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (decision.response !== undefined) {
    sendResponse(decision.response);
  }

  return true; // Keep message channel open
});

// Highlight text function: clear previous marks then apply new ones over body.
function highlightText(searchText: string) {
  const body = getBodyOrWarn();
  if (!body) return;

  removeHighlights();

  if (!searchText.trim()) return;

  applyHighlight(body, searchText);
}

// Remove highlights across the whole body.
function removeHighlights() {
  const body = getBodyOrWarn();
  if (!body) return;
  clearHighlights(body);
}

function whenBodyReady(cb: () => void) {
  const runIfReady = () => {
    if (document.body) {
      cb();
      return true;
    }
    return false;
  };

  if (runIfReady()) return;

  // In some documents (e.g., PDFs), DOMContentLoaded can fire without a body.
  // Retry a few times before giving up.
  let retries = 5;
  const retry = () => {
    if (runIfReady()) return;
    if (retries-- <= 0) return;
    setTimeout(retry, 50);
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!runIfReady()) retry();
  }, { once: true });
}

// Monitor page changes (for SPAs) and send initial data once body is available
whenBodyReady(() => {
  const body = getBodyOrWarn();
  if (!body) {
    console.warn('Content script: Unable to observe mutations because body is missing.');
    return;
  }

  let lastUrl = window.location.href;

  // Coalesce rapid mutations: re-send page data at most once per this window
  // after URL changes settle, instead of firing on every DOM mutation.
  const URL_CHANGE_DEBOUNCE = 250;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const observer = new MutationObserver(() => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    log('Page changed to:', lastUrl);

    if (debounceTimer !== undefined) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      sendPageData();
    }, URL_CHANGE_DEBOUNCE);
  });

  observer.observe(body, { childList: true, subtree: true });

  // Send initial page data when script loads
  sendPageData();
});

// Note: MV3 provides no API to programmatically open the action popup, so the
// former Ctrl/Cmd+Shift+E "open popup" shortcut and its message were removed.

// Bundled IIFE content-script entrypoint; the export below only keeps this a module.
export {};
