const runButton = document.getElementById('run');

runButton.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'run' }, () => {
    window.close();
  });
});
