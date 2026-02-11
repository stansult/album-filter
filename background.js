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

  const tabId = message.tabId || sender?.tab?.id;
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

chrome.action.onClicked.addListener(tab => {
  const tabId = tab?.id;
  if (!tabId) return;

  chrome.scripting.executeScript(
    {
      target: { tabId },
      func: () => {
        const panelId = 'album-filter-panel';
        const styleId = 'album-filter-style';
        const hiddenClass = 'album-filter-card-hidden';

        const app = window.__albumFilterApp;
        if (app && typeof app.destroy === 'function') {
          app.destroy();
          delete window.__albumFilterApp;
          return { toggled: 'closed' };
        }

        const panel = document.getElementById(panelId);
        const style = document.getElementById(styleId);
        if (panel || style) {
          if (panel) panel.remove();
          if (style) style.remove();
          document.querySelectorAll(`.${hiddenClass}`).forEach(node => {
            node.classList.remove(hiddenClass);
          });
          delete window.__albumFilterApp;
          return { toggled: 'closed' };
        }

        return { toggled: 'open' };
      }
    },
    results => {
      if (chrome.runtime.lastError) return;
      const state = results?.[0]?.result?.toggled;
      if (state !== 'open') return;

      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ['content.js']
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    }
  );
});
