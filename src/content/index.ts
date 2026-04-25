// Content script that runs on web pages
console.log('Content script loaded on:', window.location.href);

// Interface for page data
interface PageData {
  title: string;
  url: string;
  wordCount: number;
  linkCount: number;
  imageCount: number;
}

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
  const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

  // Count links and images
  const linkCount = body.querySelectorAll('a[href]').length;
  const imageCount = body.querySelectorAll('img').length;

  return { title, url, wordCount, linkCount, imageCount };
}

// Send page data to background script
function sendPageData() {
  const pageData = analyzePage();

  chrome.runtime.sendMessage({ action: 'pageAnalyzed', data: pageData }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Error sending message:', chrome.runtime.lastError);
    }
  });
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case 'getPageData':
      sendResponse(analyzePage());
      break;

    case 'highlightText':
      highlightText(request.text);
      sendResponse({ success: true });
      break;

    case 'scrollToTop':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      sendResponse({ success: true });
      break;

    default:
      console.log('Unknown action:', request.action);
  }

  return true; // Keep message channel open
});

// Highlight text function
function highlightText(searchText: string) {
  // Remove previous highlights
  removeHighlights();

  if (!searchText.trim()) return;

  const body = getBodyOrWarn();
  if (!body) return;

  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);

  const textNodes: Text[] = [];
  let node: Text | null;

  while (node = walker.nextNode() as Text) {
    if (node.textContent && node.textContent.toLowerCase().includes(searchText.toLowerCase())) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;

    const text = textNode.textContent || '';
    const regex = new RegExp(`(${searchText})`, 'gi');
    const parts = text.split(regex);

    const fragment = document.createDocumentFragment();

    parts.forEach(part => {
      if (part.toLowerCase() === searchText.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.className = 'extension-highlight';
        mark.style.backgroundColor = '#ffeb3b';
        mark.style.padding = '1px 2px';
        mark.style.borderRadius = '2px';
        mark.textContent = part;
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    parent.replaceChild(fragment, textNode);
  });
}

// Remove highlights
function removeHighlights() {
  const highlights = document.querySelectorAll('.extension-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
      parent.normalize();
    }
  });
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
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('Page changed to:', lastUrl);
      sendPageData();
    }
  });

  observer.observe(body, { childList: true, subtree: true });

  // Send initial page data when script loads
  sendPageData();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
  // Ctrl/Cmd + Shift + E to open extension popup
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'E') {
    event.preventDefault();
    chrome.runtime.sendMessage({ action: 'openPopup' });
  }
});

// Export for potential use by other scripts
export { analyzePage, highlightText, removeHighlights };
