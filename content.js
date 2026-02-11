(() => {
  const DEFAULT_PREFS = {
    enabled: true,
    strictMode: false
  };

  const PANEL_ID = 'album-filter-panel';
  const STYLE_ID = 'album-filter-style';
  const MATCHED_CLASS = 'album-filter-card-hidden';
  const NON_ALBUM_HIDDEN_CLASS = 'album-filter-non-album-hidden';
  const SUPPORTED_PATH = /\/photos_albums(?:[/?#]|$)/i;
  const APP_VERSION = '1.1.0';
  const TOAST_INFO_BG = 'rgba(20, 40, 70, 0.75)';
  const TOAST_SUCCESS_BG = 'rgba(20, 70, 40, 0.75)';
  const TOAST_EXPIRED_BG = 'rgba(60, 60, 60, 0.75)';
  const TOAST_ERROR_BG = 'rgba(120, 30, 30, 0.85)';

  function normalize(text) {
    return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function isSupportedPage() {
    const isFacebookAlbums = window.location.hostname.includes('facebook.com')
      && SUPPORTED_PATH.test(window.location.pathname + window.location.search);

    if (isFacebookAlbums) return true;

    // Allow local/hosted test playground usage.
    return !!document.querySelector('[data-af-album-grid]');
  }

  function isTestPlaygroundPage() {
    return !!document.querySelector('[data-af-album-grid]');
  }

  function getPrefs() {
    return new Promise(resolve => {
      chrome.storage.sync.get(DEFAULT_PREFS, prefs => {
        resolve({ ...DEFAULT_PREFS, ...prefs });
      });
    });
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        width: 320px;
        background: #ffffff;
        color: #111827;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
        font-size: 13px;
        line-height: 1.35;
        overflow: hidden;
      }
      #${PANEL_ID} .af-head {
        background: #f8fafc;
        border-bottom: 1px solid #e5e7eb;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${PANEL_ID} .af-title {
        font-weight: 700;
        color: #1f2937;
      }
      #${PANEL_ID} .af-close {
        border: 1px solid #d1d5db;
        background: #fff;
        border-radius: 6px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        padding: 0;
        font-size: 16px;
        font-weight: 600;
      }
      #${PANEL_ID} .af-body {
        padding: 10px;
        display: grid;
        gap: 8px;
      }
      #${PANEL_ID} .af-input-wrap {
        position: relative;
      }
      #${PANEL_ID} .af-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 7px 30px 7px 9px;
        font-size: 13px;
      }
      #${PANEL_ID} .af-input-clear {
        position: absolute;
        top: 50%;
        right: 8px;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: #64748b;
        font-size: 16px;
        line-height: 1;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      #${PANEL_ID} .af-input-clear:hover {
        background: #e2e8f0;
        color: #334155;
      }
      #${PANEL_ID} .af-input-clear:disabled {
        cursor: default;
        opacity: 0.35;
      }
      #${PANEL_ID} .af-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      #${PANEL_ID} .af-btn {
        border: 1px solid #c7d2fe;
        background: #eef2ff;
        color: #111827;
        border-radius: 7px;
        padding: 6px 4px;
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
      }
      #${PANEL_ID} .af-btn:hover {
        background: #e0e7ff;
      }
      #${PANEL_ID} .af-btn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      #${PANEL_ID} .af-btn[aria-pressed="true"] {
        background: #dbeafe;
        border-color: #60a5fa;
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.35);
      }
      #${PANEL_ID} .af-btn.secondary {
        background: #f8fafc;
        border-color: #d1d5db;
      }
      #${PANEL_ID} .af-btn.secondary:hover {
        background: #f1f5f9;
      }
      #${PANEL_ID} .af-status {
        color: #334155;
        font-size: 12px;
      }
      #${PANEL_ID} .af-status.warn {
        color: #b45309;
      }
      #${PANEL_ID} .af-help {
        color: #64748b;
        font-size: 11px;
        white-space: pre-line;
      }
      .${MATCHED_CLASS} {
        display: none !important;
      }
      .${NON_ALBUM_HIDDEN_CLASS} {
        display: none !important;
      }
      [data-af-layout-root][data-af-compact="true"] {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)) !important;
        gap: 0 !important;
        align-items: start !important;
      }
      [data-af-layout-root][data-af-compact="true"] > * {
        min-width: 0 !important;
        width: auto !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function showToast(text, options = {}) {
    const {
      duration = 1800,
      level = 'info'
    } = options;
    const existing = document.getElementById('album-filter-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'album-filter-toast';
    toast.textContent = text;
    const panel = document.getElementById(PANEL_ID);
    const toastRight = panel ? `${panel.offsetWidth + 28}px` : '14px';
    const background = level === 'success'
      ? TOAST_SUCCESS_BG
      : level === 'expired'
        ? TOAST_EXPIRED_BG
        : level === 'error'
          ? TOAST_ERROR_BG
          : TOAST_INFO_BG;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '14px',
      right: toastRight,
      zIndex: '999999',
      padding: '8px 12px',
      borderRadius: '4px',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
      fontSize: '13px',
      lineHeight: '1.3',
      color: '#fff',
      background,
      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
      opacity: '0',
      transition: 'opacity 0.2s ease'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  function isCreateAnchor(anchor) {
    const href = anchor.getAttribute('href') || '';
    return href.includes('/media/set/create/');
  }

  function isAlbumAnchor(anchor) {
    const href = anchor.getAttribute('href') || '';
    return href.includes('/media/set/?set=') || href.includes('/media/set/?set=') || href.includes('/media/set/?set');
  }

  function readTitle(anchor) {
    const titleNodes = anchor.querySelectorAll('span[dir="auto"], div[dir="auto"]');
    for (const node of titleNodes) {
      const text = (node.textContent || '').trim();
      if (!text) continue;
      if (/^\d+\s+items?$/i.test(text)) continue;
      if (/^create album$/i.test(text)) continue;
      return text;
    }
    return (anchor.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function readCount(anchor) {
    const nodes = anchor.querySelectorAll('span[dir="auto"], div[dir="auto"]');
    for (const node of nodes) {
      const text = (node.textContent || '').trim();
      if (/^\d+\s+items?$/i.test(text)) return text;
    }
    return '';
  }

  function findCardContainer(anchor) {
    const byWidth = anchor.closest('div[style*="min-width: 168px"], div[style*="min-width:168px"]');
    if (byWidth) return byWidth;

    let current = anchor;
    for (let i = 0; i < 8 && current; i += 1) {
      current = current.parentElement;
      if (!current) break;
      if (current.querySelector('img') && /items?/i.test(current.textContent || '')) {
        return current;
      }
    }

    return anchor;
  }

  function createApp(prefs) {
    const state = {
      prefs,
      query: '',
      albums: [],
      autoScanActive: false,
      autoScanTimer: null,
      testPageAutoButton: null,
      stagnantCycles: 0,
      lastScanCount: 0,
      observer: null,
      rescanTimer: null,
      layoutRoot: null
    };

    ensureStyles();

    let panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();

    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="af-head">
        <div class="af-title">Album Filter</div>
        <button type="button" class="af-close" aria-label="Close panel">×</button>
      </div>
      <div class="af-body">
        <div class="af-input-wrap">
          <input class="af-input" type="text" placeholder="Filter albums by title...">
          <button type="button" class="af-input-clear" aria-label="Clear filter">×</button>
        </div>
        <div class="af-row">
          <button type="button" class="af-btn" data-action="scan">Rescan loaded</button>
          <button type="button" class="af-btn" data-action="auto">Auto-load</button>
          <button type="button" class="af-btn secondary" data-action="stop">Stop</button>
        </div>
        <div class="af-help">- Rescan loaded updates the list from albums already in the page DOM.
- Auto-load fetches more pages.</div>
        <div class="af-status" aria-live="polite">Ready</div>
      </div>
    `;

    document.body.appendChild(panel);

    const input = panel.querySelector('.af-input');
    const status = panel.querySelector('.af-status');
    const scanBtn = panel.querySelector('button[data-action="scan"]');
    const autoBtn = panel.querySelector('button[data-action="auto"]');
    const stopBtn = panel.querySelector('button[data-action="stop"]');
    const clearBtn = panel.querySelector('.af-input-clear');

    function syncButtonState() {
      autoBtn.setAttribute('aria-pressed', state.autoScanActive ? 'true' : 'false');
      autoBtn.textContent = state.autoScanActive ? 'Auto-loading' : 'Auto-load';
      stopBtn.disabled = !state.autoScanActive;
      clearBtn.disabled = !state.query;
      scanBtn.disabled = false;
    }

    function stopTestPageAutoIfRunning() {
      if (!isTestPlaygroundPage()) return;
      const testAuto = document.getElementById('auto-load');
      if (!testAuto) return;
      state.testPageAutoButton = testAuto;
      if (testAuto.getAttribute('aria-pressed') === 'true') testAuto.click();
    }

    function setStatus(text, warn) {
      status.textContent = text;
      status.classList.toggle('warn', !!warn);
    }

    function clearCompactLayout() {
      if (state.layoutRoot && state.layoutRoot.isConnected) {
        state.layoutRoot.removeAttribute('data-af-layout-root');
        state.layoutRoot.removeAttribute('data-af-compact');
      }
      document.querySelectorAll(`.${NON_ALBUM_HIDDEN_CLASS}`).forEach(node => {
        node.classList.remove(NON_ALBUM_HIDDEN_CLASS);
      });
      state.layoutRoot = null;
    }

    function detectLayoutRoot() {
      const counts = new Map();
      state.albums.forEach(album => {
        const parent = album.card?.parentElement;
        if (!parent) return;
        counts.set(parent, (counts.get(parent) || 0) + 1);
      });
      let bestNode = null;
      let bestCount = 0;
      counts.forEach((count, node) => {
        if (count > bestCount) {
          bestCount = count;
          bestNode = node;
        }
      });
      if (!bestNode || bestCount < 3) return null;
      return bestNode;
    }

    function applyCompactLayout(enabled) {
      if (isTestPlaygroundPage()) {
        clearCompactLayout();
        return;
      }

      if (!enabled) {
        clearCompactLayout();
        return;
      }

      const root = detectLayoutRoot();
      if (!root) {
        clearCompactLayout();
        return;
      }

      if (state.layoutRoot && state.layoutRoot !== root) {
        clearCompactLayout();
      }
      state.layoutRoot = root;
      root.setAttribute('data-af-layout-root', 'true');
      root.setAttribute('data-af-compact', 'true');

      Array.from(root.children).forEach(child => {
        const hasAlbum = !!child.querySelector('a[href*="/media/set/?set"]');
        const isCreate = !!child.querySelector('a[href*="/media/set/create/"]');
        child.classList.toggle(NON_ALBUM_HIDDEN_CLASS, !hasAlbum && !isCreate);
      });
    }

    function setTestScrollLoadGuard(enabled) {
      if (!isTestPlaygroundPage()) return;
      const sentinel = document.getElementById('scroll-sentinel');
      if (!sentinel) return;
      sentinel.style.display = enabled ? 'none' : '';
    }

    function collectAlbums() {
      const seen = new Set();
      const entries = [];
      const anchors = document.querySelectorAll('a[href*="/media/set/"]');

      anchors.forEach(anchor => {
        if (isCreateAnchor(anchor) || !isAlbumAnchor(anchor)) return;

        const href = anchor.href || anchor.getAttribute('href') || '';
        const card = findCardContainer(anchor);
        const title = readTitle(anchor);
        const count = readCount(anchor);
        const key = `${href}::${title}`;

        if (!title || seen.has(key)) return;
        seen.add(key);

        entries.push({
          key,
          href,
          title,
          titleNorm: normalize(title),
          count,
          card
        });
      });

      state.albums = entries;
      return entries;
    }

    function applyFilter() {
      const q = normalize(state.query);
      let shown = 0;

      state.albums.forEach(album => {
        let matches = true;
        if (q) {
          if (state.prefs.strictMode) {
            matches = album.titleNorm === q;
          } else {
            matches = album.titleNorm.includes(q);
          }
        }

        album.card.classList.toggle(MATCHED_CLASS, !matches);
        if (matches) shown += 1;
      });

      setStatus(`Albums loaded: ${state.albums.length} • Showing: ${shown}`);
      setTestScrollLoadGuard(!!q && !state.autoScanActive);
      applyCompactLayout(!!q);
    }

    function scanAndFilter() {
      collectAlbums();
      applyFilter();
    }

    function stopAutoScan(reason) {
      state.autoScanActive = false;
      state.stagnantCycles = 0;
      state.lastScanCount = state.albums.length;
      if (state.autoScanTimer) {
        clearInterval(state.autoScanTimer);
        state.autoScanTimer = null;
      }
      if (state.testPageAutoButton && state.testPageAutoButton.getAttribute('aria-pressed') === 'true') {
        state.testPageAutoButton.click();
      }
      if (reason) setStatus(reason);
      syncButtonState();
    }

    function startAutoScan() {
      if (state.autoScanActive) return;
      state.autoScanActive = true;
      state.stagnantCycles = 0;
      state.lastScanCount = state.albums.length;
      setStatus('Auto-loading albums...');

      if (isTestPlaygroundPage()) {
        const testAuto = document.getElementById('auto-load');
        if (testAuto) {
          state.testPageAutoButton = testAuto;
          if (testAuto.getAttribute('aria-pressed') !== 'true') testAuto.click();
        }
      }
      syncButtonState();

      state.autoScanTimer = setInterval(() => {
        if (!state.autoScanActive) return;

        if (!isTestPlaygroundPage()) {
          const pinnedTop = window.scrollY;
          window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: 'auto' });
          setTimeout(() => {
            window.scrollTo({ top: pinnedTop, left: 0, behavior: 'auto' });
          }, 40);
        }

        scanAndFilter();

        if (state.albums.length > state.lastScanCount) {
          state.lastScanCount = state.albums.length;
          state.stagnantCycles = 0;
          return;
        }

        if (isTestPlaygroundPage()) {
          const end = document.querySelector('[data-af-end]');
          const ended = !!end && !end.classList.contains('hidden');
          if (ended) {
            stopAutoScan(`Complete. Loaded ${state.albums.length} albums.`);
          }
          return;
        }

        state.stagnantCycles += 1;
        if (state.stagnantCycles >= 10) {
          stopAutoScan(`Auto-scan stopped. No new albums after ${state.stagnantCycles} checks.`);
        }
      }, 1300);
    }

    function scheduleRescan() {
      if (state.rescanTimer) clearTimeout(state.rescanTimer);
      state.rescanTimer = setTimeout(() => {
        scanAndFilter();
      }, 250);
    }

    const closeBtn = panel.querySelector('.af-close');
    closeBtn.addEventListener('click', () => {
      stopAutoScan();
      if (state.observer) state.observer.disconnect();
      if (state.rescanTimer) clearTimeout(state.rescanTimer);
      clearCompactLayout();
      setTestScrollLoadGuard(false);
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      document.querySelectorAll(`.${MATCHED_CLASS}`).forEach(node => {
        node.classList.remove(MATCHED_CLASS);
      });
      panel.remove();
      delete window.__albumFilterApp;
      showToast('Album Filter closed.', { level: 'expired', duration: 1600 });
    });

    panel.addEventListener('click', event => {
      const target = event.target.closest('button[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      if (action === 'scan') {
        scanAndFilter();
        setStatus(`Refreshed. Albums loaded: ${state.albums.length}`);
        syncButtonState();
        return;
      }
      if (action === 'auto') {
        if (state.autoScanActive) {
          stopAutoScan('Auto-load stopped.');
        } else {
          startAutoScan();
        }
        return;
      }
      if (action === 'stop') {
        stopAutoScan('Auto-load stopped.');
        return;
      }
    });

    clearBtn.addEventListener('click', () => {
      if (!state.query) return;
      state.query = '';
      input.value = '';
      applyFilter();
      setStatus(`Filter cleared. Albums loaded: ${state.albums.length}`);
      syncButtonState();
      input.focus({ preventScroll: true });
    });

    input.addEventListener('input', () => {
      state.query = input.value || '';
      applyFilter();
      syncButtonState();
    });

    state.observer = new MutationObserver(() => {
      scheduleRescan();
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    scanAndFilter();
    stopTestPageAutoIfRunning();
    syncButtonState();
    setTimeout(() => {
      if (document.body.contains(panel)) input.focus({ preventScroll: true });
    }, 0);

    return {
      __version: APP_VERSION,
      destroy() {
        stopAutoScan();
        if (state.observer) state.observer.disconnect();
        if (state.rescanTimer) clearTimeout(state.rescanTimer);
        clearCompactLayout();
        setTestScrollLoadGuard(false);
        const style = document.getElementById(STYLE_ID);
        if (style) style.remove();
        document.querySelectorAll(`.${MATCHED_CLASS}`).forEach(node => {
          node.classList.remove(MATCHED_CLASS);
        });
        if (panel && panel.parentNode) panel.remove();
      },
      reactivate() {
        if (!document.body.contains(panel)) {
          document.body.appendChild(panel);
        }
        stopTestPageAutoIfRunning();
        scanAndFilter();
        input.focus({ preventScroll: true });
      }
    };
  }

  async function run() {
    if (!isSupportedPage()) {
      showToast('No supported album list found on this page.', { level: 'error' });
      return;
    }

    const prefs = await getPrefs();
    if (!prefs.enabled) {
      showToast('Album Filter is disabled in Options.', { level: 'error' });
      return;
    }

    const existingApp = window.__albumFilterApp;
    if (existingApp) {
      if (existingApp.__version === APP_VERSION && typeof existingApp.reactivate === 'function') {
        existingApp.reactivate();
        showToast('Album Filter ready.', { level: 'info' });
        return;
      }
      if (typeof existingApp.destroy === 'function') {
        existingApp.destroy();
      }
      const stalePanel = document.getElementById(PANEL_ID);
      if (stalePanel) stalePanel.remove();
      const staleStyle = document.getElementById(STYLE_ID);
      if (staleStyle) staleStyle.remove();
      delete window.__albumFilterApp;
    }

    window.__albumFilterApp = createApp(prefs);
    showToast('Album Filter injected.', { level: 'success' });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.action !== 'showToast') return;
    showToast(message.text || '', {
      level: message.level || 'info',
      duration: typeof message.duration === 'number' ? message.duration : 1800
    });
    sendResponse({ ok: true });
    return true;
  });

  run();
})();
