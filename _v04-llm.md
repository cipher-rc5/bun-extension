# Directory Structure
```
src/
  assets/
    icon128.svg
    icon16.svg
    icon32.svg
    icon48.svg
  background/
    index.ts
  content/
    index.ts
  popup/
    index.html
    index.tsx
  styles/
    globals.css
  manifest.json
package.json
postcss.config.ts
tailwind.config.ts
tsconfig.json
```

# Files

## File: src/assets/icon128.svg
```xml
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="25.6" fill="url(#grad)"/>
      <text x="64" y="76.8"
            text-anchor="middle"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="76.8"
            font-weight="bold">R</text>
    </svg>
```

## File: src/assets/icon16.svg
```xml
<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="16" height="16" rx="3.2" fill="url(#grad)"/>
      <text x="8" y="9.6"
            text-anchor="middle"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="9.6"
            font-weight="bold">R</text>
    </svg>
```

## File: src/assets/icon32.svg
```xml
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6.4" fill="url(#grad)"/>
      <text x="16" y="19.2"
            text-anchor="middle"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="19.2"
            font-weight="bold">R</text>
    </svg>
```

## File: src/assets/icon48.svg
```xml
<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="9.600000000000001" fill="url(#grad)"/>
      <text x="24" y="28.8"
            text-anchor="middle"
            fill="white"
            font-family="Arial, sans-serif"
            font-size="28.799999999999997"
            font-weight="bold">R</text>
    </svg>
```

## File: src/background/index.ts
```typescript
// Background script for the extension
console.log('Background script loaded');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default storage values
    chrome.storage.sync.set({ count: 0, settings: { theme: 'dark', notifications: true } });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);

  switch (request.action) {
    case 'getTabInfo':
      if (sender.tab) {
        sendResponse({ tabId: sender.tab.id, url: sender.tab.url, title: sender.tab.title });
      }
      break;

    case 'updateBadge':
      if (sender.tab?.id) {
        chrome.action.setBadgeText({ text: request.text || '', tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: request.color || '#3b82f6' });
      }
      break;

    default:
      console.log('Unknown action:', request.action);
  }

  return true; // Keep message channel open for async response
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log('Tab updated:', tab.url);
    // You can add logic here to react to page loads
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked for tab:', tab.id);
  // This won't fire if popup is defined in manifest
});

// Periodic cleanup or background tasks
setInterval(() => {
  // Example: Clean up old data every hour
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    Object.keys(items).forEach(key => {
      if (key.startsWith('temp_') && items[key].timestamp) {
        if (now - items[key].timestamp > oneDay) {
          chrome.storage.local.remove(key);
          console.log('Cleaned up old data:', key);
        }
      }
    });
  });
}, 60 * 60 * 1000); // Run every hour

export {};
```

## File: src/popup/index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Extension</title>
    <link rel="stylesheet" href="styles.css">
    <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      width: 375px;
      min-height: 500px;
    }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="index.js"></script>
  </body>
</html>
```

## File: src/styles/globals.css
```css
/* Tailwind CSS v4 - Use @import "tailwindcss" */
@import "tailwindcss";

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth transitions */
* {
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Focus styles */
button:focus,
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Custom button animations */
@keyframes buttonPress {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

button:active {
  animation: buttonPress 0.1s ease-in-out;
}

/* Extension specific styles */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Responsive breakpoints for extension popup */
@media (max-width: 320px) {
  body {
    width: 320px;
  }
}

@media (min-width: 376px) {
  body {
    width: 400px;
  }
}
```

## File: postcss.config.ts
```typescript
// postcss.config.ts
const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };

export default config;
```

## File: tailwind.config.ts
```typescript
// tailwind.config.ts
import { type Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/popup/*.html', './dist/*.html'],
  theme: {
    extend: {
      colors: { primary: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' } },
      animation: { 'fade-in': 'fadeIn 0.3s ease-in-out', 'slide-up': 'slideUp 0.3s ease-out' },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } }
      }
    }
  },
  plugins: []
};

export default config;
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noPropertyAccessFromIndexSignature": false,
    "types": ["chrome"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## File: src/content/index.ts
```typescript
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
```

## File: src/popup/index.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

interface TabInfo {
  title: string;
  url: string;
}

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Get current tab information
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab({ title: tabs[0].title || 'Unknown', url: tabs[0].url || 'Unknown' });
      }
      setIsLoading(false);
    });

    // Load stored count
    chrome.storage.sync.get(['count'], (result) => {
      setCount((result.count as number) || 0);
    });
  }, []);

  const incrementCount = () => {
    const newCount = count + 1;
    setCount(newCount);
    chrome.storage.sync.set({ count: newCount });
  };

  const resetCount = () => {
    setCount(0);
    chrome.storage.sync.set({ count: 0 });
  };

  if (isLoading) {
    return (
      <div className='w-full h-96 flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-125 bg-linear-to-br from-blue-50 to-indigo-100 animate-fade-in'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-gray-200 p-4'>
        <div className='flex items-center space-x-3'>
          <div className='w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center'>
            <svg className='w-5 h-5 text-white' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                clipRule='evenodd' />
            </svg>
          </div>
          <div>
            <h1 className='text-lg font-semibold text-gray-900'>React Extension</h1>
            <p className='text-sm text-gray-500'>Powered by Bun & TypeScript</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='p-4 space-y-6'>
        {/* Current Tab Info */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up'>
          <h2 className='text-md font-medium text-gray-900 mb-3 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z'
                clipRule='evenodd' />
            </svg>
            Current Tab
          </h2>
          <div className='space-y-2'>
            <div>
              <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>Title</p>
              <p className='text-sm text-gray-900 truncate' title={activeTab?.title}>{activeTab?.title}</p>
            </div>
            <div>
              <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>URL</p>
              <p className='text-sm text-gray-600 truncate' title={activeTab?.url}>{activeTab?.url}</p>
            </div>
          </div>
        </section>

        {/* Counter Section */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up' style={{ animationDelay: '0.1s' }}>
          <h2 className='text-md font-medium text-gray-900 mb-4 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L10 9.586V6z'
                clipRule='evenodd' />
            </svg>
            Click Counter
          </h2>

          <div className='text-center space-y-4'>
            <div className='bg-linear-to-br from-primary-50 to-indigo-50 rounded-lg p-6'>
              <p className='text-3xl font-bold text-primary-700'>{count}</p>
              <p className='text-sm text-gray-600 mt-1'>Total Clicks</p>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <button
                onClick={incrementCount}
                className='bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
                    clipRule='evenodd' />
                </svg>
                <span>Add</span>
              </button>

              <button
                onClick={resetCount}
                className='bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2'>
                <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                    clipRule='evenodd' />
                </svg>
                <span>Reset</span>
              </button>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className='bg-white rounded-lg shadow-sm p-4 animate-slide-up' style={{ animationDelay: '0.2s' }}>
          <h2 className='text-md font-medium text-gray-900 mb-3 flex items-center'>
            <svg className='w-4 h-4 mr-2 text-primary-600' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
                clipRule='evenodd' />
            </svg>
            Quick Actions
          </h2>

          <div className='space-y-2'>
            <button className='w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3'>
              <div className='w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center'>
                <svg className='w-4 h-4 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                    clipRule='evenodd' />
                </svg>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Mark as Important</p>
                <p className='text-xs text-gray-500'>Save this page for later</p>
              </div>
            </button>

            <button className='w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3'>
              <div className='w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center'>
                <svg className='w-4 h-4 text-blue-600' fill='currentColor' viewBox='0 0 20 20'>
                  <path d='M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z' />
                </svg>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-900'>Share Page</p>
                <p className='text-xs text-gray-500'>Copy link to clipboard</p>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

// Mount the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
```

## File: src/manifest.json
```json
{
  "manifest_version": 3,
  "name": "prototype_extension",
  "version": "1.0.0",
  "description": "responsive_react_browser_extension",
  "permissions": ["activeTab", "storage"],
  "action": { "default_popup": "index.html", "default_title": "prototype_extension" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
}
```

## File: package.json
```json
{
  "name": "bun-extension",
  "module": "index.ts",
  "description": "responsive react browser extension built with typescript and tailwindcss",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "bun run build/build-all.ts",
    "build:css": "bunx @tailwindcss/cli -i ./src/styles/globals.css -o ./dist/styles.css --minify",
    "build:extension": "bun build ./src/popup/index.tsx --outdir ./dist --target browser --minify --entry-naming index.js",
    "build:content": "bun build ./src/content/index.ts --outdir ./dist --target browser --minify --entry-naming content.js",
    "build:background": "bun build ./src/background/index.ts --outdir ./dist --target browser --minify --entry-naming background.js",
    "copy:assets": "bun run build/copy-assets.ts",
    "generate:icons": "bun run build/generate-icons.ts",
    "dev": "bun run build && bun --watch run build",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": { "@types/bun": "^1.3.8" },
  "dependencies": {
    "@types/chrome": "^0.1.36",
    "@types/react": "^19.2.13",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.24",
    "postcss": "^8.5.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.9.3"
  }
}
```
