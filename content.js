// content.js
(function () {
  function handleAuxClick(e) {
    // FIX: Check if the extension context is still valid.
    // If chrome.runtime.id is missing, the extension was disabled or uninstalled.
    if (!chrome?.runtime?.id) return;

    if (e.button !== 1) return; // middle mouse
    const anchor = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
    if (!anchor) return;

    const href = anchor.href;
    if (!href || href.startsWith('javascript:')) return;

    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

    // Stop the browser from opening a new tab.
    e.preventDefault();
    e.stopPropagation();

    // Save the URL via the background service worker.
    // Added a catch block to silently ignore errors if the background is asleep
    chrome.runtime.sendMessage({ type: "save-url", url: href }).catch(() => {});
  }

  window.addEventListener("auxclick", handleAuxClick, true);

  window.addEventListener("mousedown", function (e) {
    if (!chrome?.runtime?.id) return; // FIX: check validity here too
    if (e.button !== 1) return;
    const anchor = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
    if (!anchor) return;
  }, true);
})();
