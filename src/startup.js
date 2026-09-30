// Keep a visible way back when a module or the live catalog cannot load.
(() => {
  const placeholder = document.querySelector('#app-startup');
  if (!placeholder) return;
  const message = placeholder.querySelector('[data-startup-message]');
  const retry = placeholder.querySelector('a');
  retry.href = location.href;
  let finished = false;
  let failed = false;
  function failure(event) {
    if (finished || !placeholder.isConnected) return;
    if (failed && !event?.detail?.message) return;
    failed = true;
    clearTimeout(slow);
    message.textContent = event?.detail?.message || 'לא הצלחנו לטעון את האתר. נסו שוב.';
    retry.hidden = false;
  }
  const slow = setTimeout(() => {
    if (!finished && !failed && placeholder.isConnected) {
      message.textContent = 'הטעינה מתעכבת. אפשר לנסות שוב.';
      retry.hidden = false;
    }
  }, 10000);
  const observer = new MutationObserver(() => {
    if (placeholder.isConnected) return;
    finished = true;
    clearTimeout(slow);
    observer.disconnect();
    window.removeEventListener('error', failure, true);
    window.removeEventListener('unhandledrejection', failure);
    window.removeEventListener('pizza-startup-failed', failure);
  });
  observer.observe(document.querySelector('#app'), { childList: true });
  window.addEventListener('error', failure, true);
  window.addEventListener('unhandledrejection', failure);
  window.addEventListener('pizza-startup-failed', failure);
})();
