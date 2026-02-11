const enabled = document.getElementById('enabled');
const strictMode = document.getElementById('strict-mode');
const saveButton = document.getElementById('save');
const status = document.getElementById('status');

const DEFAULT_PREFS = {
  enabled: true,
  strictMode: false
};

function load() {
  chrome.storage.sync.get(DEFAULT_PREFS, prefs => {
    enabled.checked = !!prefs.enabled;
    strictMode.checked = !!prefs.strictMode;
  });
}

function save() {
  const prefs = {
    enabled: enabled.checked,
    strictMode: strictMode.checked
  };
  chrome.storage.sync.set(prefs, () => {
    status.textContent = 'Saved';
    setTimeout(() => {
      status.textContent = '';
    }, 1200);
  });
}

saveButton.addEventListener('click', save);
load();
