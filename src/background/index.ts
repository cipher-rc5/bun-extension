// Background script for the extension
import { shouldCleanup } from '../lib/cleanup';
import { handleBackgroundMessage } from '../lib/handlers';
import type { ExtensionMessage, SendResponse } from '../shared/messages';

const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log(...args);
};

log('Background script loaded');

// Warn on a fire-and-forget chrome API failure without disturbing the happy path.
function warnOnError(context: string) {
  if (chrome.runtime.lastError) {
    console.warn(`Background: ${context}:`, chrome.runtime.lastError.message);
  }
}

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    log('Extension installed');
    // Initialize default storage values
    chrome.storage.sync.set(
      { count: 0, settings: { theme: 'dark', notifications: true } },
      () => warnOnError('failed to initialize storage')
    );
  }
});

// Throttle lastPageAnalysis writes so a chatty content script can't hammer
// chrome.storage.local; write at most once per this window.
const PAGE_ANALYSIS_WRITE_INTERVAL = 2000;
let lastPageAnalysisWrite = 0;

// Listen for messages from content scripts or popup. The listener stays a thin
// wrapper: handleBackgroundMessage shapes the response, we perform side effects.
chrome.runtime.onMessage.addListener((request: ExtensionMessage, sender, sendResponse: SendResponse) => {
  log('Message received:', request);

  const decision = handleBackgroundMessage(request, sender);

  if (decision.badge) {
    chrome.action.setBadgeText({ text: decision.badge.text, tabId: decision.badge.tabId }, () => warnOnError('failed to set badge text'));
    chrome.action.setBadgeBackgroundColor({ color: decision.badge.color }, () => warnOnError('failed to set badge color'));
  }

  if (decision.store) {
    // Bound how often we persist the latest analysis.
    const now = Date.now();
    if (now - lastPageAnalysisWrite >= PAGE_ANALYSIS_WRITE_INTERVAL) {
      lastPageAnalysisWrite = now;
      chrome.storage.local.set({ [decision.store.key]: decision.store.value }, () => warnOnError('failed to store page analysis'));
    }
  }

  sendResponse(decision.response);

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
function runCleanup() {
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    Object.keys(items).forEach(key => {
      if (shouldCleanup(key, items[key], now, oneDay)) {
        chrome.storage.local.remove(key, () => warnOnError('failed to remove old data'));
        log('Cleaned up old data:', key);
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
