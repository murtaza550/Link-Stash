// content.js — LinkStash v2
(function () {
  // Guard against double injection
  if (window.__smclInjected) return;
  window.__smclInjected = true;

  let enabled = true;

  // --- Get initial enabled state ---
  if (chrome?.runtime?.id) {
    chrome.runtime.sendMessage({ type: "get-state" }).then(res => {
      if (res) enabled = res.enabled;
    }).catch(() => { });
  }

  // --- Listen for toggle changes via storage (#3) ---
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        enabled = changes.enabled.newValue;
      }
    });
  } catch (e) { /* content script may lose context */ }

  // --- Toast Notification (#4) ---
  function showToast(message, type) {
    const existing = document.getElementById("__smcl-toast");
    if (existing) existing.remove();

    const colors = { success: "#22c55e", duplicate: "#f59e0b" };

    const toast = document.createElement("div");
    toast.id = "__smcl-toast";
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      padding: 10px 18px !important;
      background: ${colors[type] || colors.success} !important;
      color: #fff !important;
      border-radius: 8px !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      line-height: 1.4 !important;
      z-index: 2147483647 !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18) !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transform: translateY(8px) !important;
      transition: opacity 0.25s ease, transform 0.25s ease !important;
      max-width: 340px !important;
      word-break: break-word !important;
    `;

    (document.body || document.documentElement).appendChild(toast);

    // Trigger animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function getDisplayUrl(href) {
    try {
      const u = new URL(href);
      let display = u.hostname + u.pathname;
      if (display.length > 55) display = display.substring(0, 52) + "\u2026";
      return display;
    } catch (e) {
      return href.substring(0, 55);
    }
  }

  // --- Alt+Click Handler ---
  function handleAltClick(e) {
    if (!chrome?.runtime?.id) return;
    if (e.button !== 0 || !e.altKey) return; // only Alt + left-click

    const anchor = e.target && (e.target.closest ? e.target.closest("a[href]") : null);
    if (!anchor) return;

    const href = anchor.href;
    if (!href || href.startsWith("javascript:")) return;

    // When disabled, let normal click behavior happen (#3)
    if (!enabled) return;

    e.preventDefault();
    e.stopPropagation();

    // Extract link text for a meaningful title
    const rawTitle = (anchor.textContent || "").trim().replace(/\s+/g, " ");
    const title = rawTitle.substring(0, 200) || href;

    chrome.runtime.sendMessage({ type: "save-url", url: href, title }).then(res => {
      if (!res) return;
      if (res.duplicate) {
        showToast("\u26A0 Already saved: " + getDisplayUrl(href), "duplicate");  // #7
      } else if (res.ok) {
        showToast("\u2713 Saved: " + getDisplayUrl(href), "success");  // #4
      }
    }).catch(() => { });
  }

  window.addEventListener("click", handleAltClick, true);
})();