(() => {
  // Stub content script for Album Filter.
  // Replace this with your domain-specific logic.
  if (window.__albumFilterInjected) return;
  window.__albumFilterInjected = true;

  const existing = document.getElementById('album-filter-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'album-filter-toast';
  toast.textContent = 'Album Filter stub: content script injected.';
  Object.assign(toast.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '2147483647',
    padding: '8px 10px',
    borderRadius: '6px',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
    fontSize: '12px',
    color: '#fff',
    background: 'rgba(20, 70, 40, 0.9)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  });

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
})();
