import { handleBackgroundMessage } from '../lib/handlers';
import { CLEANUP_ALARM, ensureCleanupAlarm, runCleanup } from '../lib/lifecycle';
import { createAnalysisWriter, createCounterStore } from '../lib/storage';
import { failure, parseMessage, routeAction } from '../shared/messages';
const counter = createCounterStore(chrome.storage.sync);
const storeAnalysis = createAnalysisWriter(chrome.storage.local);
const effects = {
  counter,
  storeAnalysis,
  async setBadge(tabId: number, text: string, color: string) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color });
    await chrome.action.setBadgeText({ tabId, text });
  }
};
chrome.runtime.onMessage.addListener((value: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) {
    sendResponse(failure(new Error('Unauthorized sender')));
    return false;
  }
  const request = parseMessage(value);
  if (!request || routeAction(request.action) !== 'background') {
    sendResponse(failure(new Error('Invalid background message')));
    return false;
  }
  void handleBackgroundMessage(request, sender, effects).then(sendResponse);
  // Keep the response channel open until asynchronous effects finish.
  return true;
});
function warn(context: string, error: unknown) {
  console.warn(`Background: ${context}:`, error instanceof Error ? error.message : 'Operation failed');
}
void ensureCleanupAlarm(chrome.alarms).catch(error => warn('cleanup alarm unavailable', error));
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === CLEANUP_ALARM) void runCleanup(chrome.storage.local).catch(error => warn('cleanup failed', error));
});
