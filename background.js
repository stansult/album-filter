const DEFAULT_PREFS = {
  enabled: true,
  strictMode: false
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_PREFS, current => {
    const next = { ...DEFAULT_PREFS, ...current };
    chrome.storage.sync.set(next);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.action !== 'run') return;

  const tabId = sender?.tab?.id;
  if (!tabId) {
    sendResponse({ ok: false, error: 'No active tab context' });
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId },
      files: ['content.js']
    },
    () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ ok: true });
    }
  );

  return true;
});
