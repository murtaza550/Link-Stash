// background.js — Save Middle-Click Links v2

// --- Badge Restoration (fixes #9) ---
function restoreBadge() {
  chrome.storage.local.get({ savedLinks: [], enabled: true }, (data) => {
    if (!data.enabled) {
      chrome.action.setBadgeText({ text: "OFF" });
      chrome.action.setBadgeBackgroundColor({ color: "#999" });
    } else {
      const count = data.savedLinks.length;
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
      chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    }
  });
}

// --- Install / Startup ---
chrome.runtime.onInstalled.addListener(() => {
  // Migrate from old format (savedUrls: string[]) to new format (savedLinks: object[])
  chrome.storage.local.get(null, (data) => {
    if (data.savedUrls && Array.isArray(data.savedUrls) && data.savedUrls.length > 0 &&
      (!data.savedLinks || data.savedLinks.length === 0)) {
      const migrated = data.savedUrls.map(url => ({
        url,
        title: url,
        timestamp: Date.now()
      }));
      chrome.storage.local.set({ savedLinks: migrated, enabled: true }, () => {
        chrome.storage.local.remove("savedUrls");
        restoreBadge();
      });
    } else {
      if (!Array.isArray(data.savedLinks)) {
        chrome.storage.local.set({ savedLinks: [] });
      }
      if (typeof data.enabled === "undefined") {
        chrome.storage.local.set({ enabled: true });
      }
      restoreBadge();
    }
  });

  // Inject content.js into all open tabs immediately
  chrome.tabs.query({ url: ["http://*/*", "https://*/*"] }, (tabs) => {
    for (const tab of tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }).catch(err => console.log("Skipped tab:", tab.id, err));
    }
  });
});

// Restore badge on every browser startup (#9)
chrome.runtime.onStartup.addListener(restoreBadge);

// --- Message Router ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  switch (message.type) {

    // --- Save a URL (with duplicate detection #7) ---
    case "save-url": {
      if (typeof message.url !== "string") return false;

      chrome.storage.local.get({ savedLinks: [], enabled: true }, (data) => {
        if (!data.enabled) {
          sendResponse({ ok: false, disabled: true });
          return;
        }

        const isDuplicate = data.savedLinks.some(link => link.url === message.url);
        if (isDuplicate) {
          sendResponse({ ok: true, duplicate: true });
          return;
        }

        const newLink = {
          url: message.url,
          title: message.title || message.url,
          timestamp: Date.now()
        };
        const updated = [...data.savedLinks, newLink];
        chrome.storage.local.set({ savedLinks: updated }, () => {
          chrome.action.setBadgeText({ text: String(updated.length) });
          chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
          sendResponse({ ok: true, duplicate: false });
        });
      });
      return true; // keep channel open for async sendResponse
    }

    // --- Get enabled state (for content script) ---
    case "get-state": {
      chrome.storage.local.get({ enabled: true }, (data) => {
        sendResponse({ enabled: data.enabled });
      });
      return true;
    }

    // --- Toggle enabled/disabled (#3) ---
    case "toggle": {
      chrome.storage.local.get({ enabled: true, savedLinks: [] }, (data) => {
        const newState = !data.enabled;
        chrome.storage.local.set({ enabled: newState }, () => {
          if (!newState) {
            chrome.action.setBadgeText({ text: "OFF" });
            chrome.action.setBadgeBackgroundColor({ color: "#999" });
          } else {
            const count = data.savedLinks.length;
            chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
            chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
          }
          sendResponse({ enabled: newState });
        });
      });
      return true;
    }

    // --- Undo last save (#6) ---
    case "undo-last": {
      chrome.storage.local.get({ savedLinks: [], enabled: true }, (data) => {
        if (data.savedLinks.length === 0) {
          sendResponse({ ok: false });
          return;
        }
        const removed = data.savedLinks[data.savedLinks.length - 1];
        const updated = data.savedLinks.slice(0, -1);
        chrome.storage.local.set({ savedLinks: updated }, () => {
          if (data.enabled) {
            chrome.action.setBadgeText({ text: updated.length > 0 ? String(updated.length) : "" });
          }
          sendResponse({ ok: true, removed });
        });
      });
      return true;
    }

    // --- Delete individual link (#6) ---
    case "delete-link": {
      chrome.storage.local.get({ savedLinks: [], enabled: true }, (data) => {
        // Match by both url and timestamp for precision (handles duplicate URLs saved at different times)
        const idx = data.savedLinks.findIndex(
          link => link.url === message.url && link.timestamp === message.timestamp
        );
        if (idx === -1) {
          sendResponse({ ok: false });
          return;
        }
        const updated = [...data.savedLinks];
        updated.splice(idx, 1);
        chrome.storage.local.set({ savedLinks: updated }, () => {
          if (data.enabled) {
            chrome.action.setBadgeText({ text: updated.length > 0 ? String(updated.length) : "" });
          }
          sendResponse({ ok: true });
        });
      });
      return true;
    }

    default:
      return false;
  }
});