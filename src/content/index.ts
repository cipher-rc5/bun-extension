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

// Analyze the current page
function analyzePage(): PageData {
  const title = document.title;
  const url = window.location.href;

  // Count words in visible text
  const textContent = document.body.innerText || '';
  const wordCount = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;

  // Count links and images
  const linkCount = document.querySelectorAll('a[href]').length;
  const imageCount = document.querySelectorAll('img').length;

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

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

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

// Monitor page changes (for SPAs)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('Page changed to:', lastUrl);
    sendPageData();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Send initial page data when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendPageData);
} else {
  sendPageData();
}

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
