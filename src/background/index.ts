// Background script for the extension
console.log('Background script loaded');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default storage values
    chrome.storage.sync.set({ count: 0, settings: { theme: 'light', notifications: true } });
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
