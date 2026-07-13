// Background script for the extension
const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

log('Background script loaded');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log('Extension installed');
    // Initialize default storage values
    chrome.storage.sync.set({ count: 0, settings: { theme: 'dark', notifications: true } });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Message received:', request);

  switch (request.action) {
    case 'getTabInfo':
      if (sender.tab) {
        sendResponse({ tabId: sender.tab.id, url: sender.tab.url, title: sender.tab.title });
      } else {
        sendResponse({ error: 'no tab' });
      }
      break;

    case 'updateBadge':
      if (sender.tab?.id) {
        chrome.action.setBadgeText({ text: request.text || '', tabId: sender.tab.id });
        chrome.action.setBadgeBackgroundColor({ color: request.color || '#3b82f6' });
        sendResponse({ success: true });
      } else {
        sendResponse({ error: 'no tab' });
      }
      break;

    default:
      log('Unknown action:', request.action);
      sendResponse({ error: 'unknown action' });
  }

  return true; // Keep message channel open for async response
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    log('Tab updated:', tab.url);
    // You can add logic here to react to page loads
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  log('Extension icon clicked for tab:', tab.id);
  // This won't fire if popup is defined in manifest
});

// Periodic cleanup or background tasks.
// MV3 service workers get suspended, so setInterval is unreliable; use chrome.alarms.
async function runCleanup() {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    Object.keys(items).forEach(key => {
      const v = items[key];
      if (
        key.startsWith('temp_') &&
        v &&
        typeof v === 'object' &&
        'timestamp' in v &&
        typeof (v as { timestamp: unknown }).timestamp === 'number'
      ) {
        const timestamp = (v as { timestamp: number }).timestamp;
        if (now - timestamp > oneDay) {
          chrome.storage.local.remove(key);
          log('Cleaned up old data:', key);
        }
      }
    });
  });
}

// requires "alarms" permission in manifest.json
chrome.alarms.create('cleanup', { periodInMinutes: 60 }); // create is idempotent by name

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') runCleanup();
});

export {};
