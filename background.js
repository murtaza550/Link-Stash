// background.js

// Initialize storage and inject content script into existing tabs when enabled/installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ savedUrls: [] }, (data) => {
    chrome.storage.local.set({ savedUrls: data.savedUrls });
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "save-url" && typeof message.url === "string") {
    chrome.storage.local.get({ savedUrls: [] }, (data) => {
      const set = new Set(data.savedUrls);
      set.add(message.url);
      const updated = Array.from(set);
      chrome.storage.local.set({ savedUrls: updated }, () => {
        chrome.action.setBadgeText({ text: String(updated.length) });
        chrome.action.setBadgeBackgroundColor({ color: "#555" });
      });
    });
    sendResponse({ ok: true });
  }
  return false;
});
