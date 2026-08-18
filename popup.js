// popup.js — LinkStash v2

// ──────────────────────────────────────────────
// DOM Refs
// ──────────────────────────────────────────────
const countBadge = document.getElementById("countBadge");
const linkList = document.getElementById("linkList");
const toggleEl = document.getElementById("toggleEnabled");
const searchInput = document.getElementById("searchInput");
const themePicker = document.getElementById("themePicker");
const formatEl = document.getElementById("exportFormat");
const exportBtn = document.getElementById("exportBtn");
const copyBtn = document.getElementById("copyBtn");
const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");

let currentLinks = [];
let searchQuery = "";

// ──────────────────────────────────────────────
// Theme Management
// ──────────────────────────────────────────────
const THEMES = ["light", "dark", "y2k", "glass"];

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = "light";
  document.body.setAttribute("data-theme", theme);
  themePicker.querySelectorAll("button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.t === theme);
  });
  chrome.storage.local.set({ uiTheme: theme });
}

themePicker.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-t]");
  if (!btn) return;
  applyTheme(btn.dataset.t);
});

// ──────────────────────────────────────────────
// Search / Filter
// ──────────────────────────────────────────────
searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderLinks(currentLinks);
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (sec < 60) return "just now";
  if (min < 60) return min + "m ago";
  if (hrs < 24) return hrs + "h ago";
  if (days === 1) return "yesterday";
  if (days < 7) return days + "d ago";
  return new Date(ts).toLocaleDateString();
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max - 1) + "\u2026" : str;
}

/** Stable hue from a domain string */
function domainHue(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "?"; }
}

// ──────────────────────────────────────────────
// Render Link List
// ──────────────────────────────────────────────
function renderLinks(links) {
  currentLinks = links;
  linkList.innerHTML = "";

  const total = links.length;
  countBadge.textContent = String(total);
  countBadge.classList.toggle("zero", total === 0);

  const empty = total === 0;
  undoBtn.disabled = empty;
  exportBtn.disabled = empty;
  copyBtn.disabled = empty;
  clearBtn.disabled = empty;

  if (empty) {
    linkList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">\uD83D\uDD17</span>
        Alt + click a link to save it here.
      </div>`;
    return;
  }

  // Filter by search query
  let visible = [...links].reverse();
  if (searchQuery) {
    visible = visible.filter(l =>
      (l.title || "").toLowerCase().includes(searchQuery) ||
      l.url.toLowerCase().includes(searchQuery)
    );
  }

  if (visible.length === 0) {
    linkList.innerHTML = `<div class="no-results">No links match your search.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  for (let i = 0; i < visible.length; i++) {
    const link = visible[i];
    const domain = getDomain(link.url);
    const hue = domainHue(domain);
    const letter = (domain[0] || "?").toUpperCase();

    const item = document.createElement("div");
    item.className = "link-item";
    item.style.animationDelay = Math.min(i * 30, 200) + "ms";

    const displayTitle = esc(truncate(link.title || link.url, 58));
    let displayUrl;
    try {
      const u = new URL(link.url);
      displayUrl = esc(truncate(u.hostname + u.pathname + u.search, 52));
    } catch {
      displayUrl = esc(truncate(link.url, 52));
    }

    item.innerHTML = `
      <div class="link-fav" style="background:hsl(${hue},60%,52%)">${letter}</div>
      <div class="link-info">
        <div class="link-title">${displayTitle}</div>
        <a class="link-url" href="${esc(link.url)}" target="_blank" rel="noopener"
           title="${esc(link.url)}">${displayUrl}</a>
        <div class="link-time">${timeAgo(link.timestamp)}</div>
      </div>
      <button class="link-del" title="Delete">\u2715</button>`;

    item.querySelector(".link-del").addEventListener("click", () => {
      chrome.runtime.sendMessage(
        { type: "delete-link", url: link.url, timestamp: link.timestamp },
        () => refresh()
      );
    });

    frag.appendChild(item);
  }

  linkList.appendChild(frag);
}

// ──────────────────────────────────────────────
// Refresh from Storage
// ──────────────────────────────────────────────
function refresh() {
  chrome.storage.local.get({ savedLinks: [], enabled: true, uiTheme: "light" }, (data) => {
    renderLinks(data.savedLinks);
    toggleEl.checked = data.enabled;
    applyTheme(data.uiTheme);
  });
}

// ──────────────────────────────────────────────
// Toggle
// ──────────────────────────────────────────────
toggleEl.addEventListener("change", () => {
  chrome.runtime.sendMessage({ type: "toggle" }, (res) => {
    if (res) toggleEl.checked = res.enabled;
  });
});

// ──────────────────────────────────────────────
// Export Formatting
// ──────────────────────────────────────────────
function formatLinks(links, fmt) {
  switch (fmt) {
    case "json":
      return { text: JSON.stringify(links, null, 2), file: "linkstash_export.json", mime: "application/json" };
    case "csv": {
      const rows = links.map(l =>
        `"${l.url.replace(/"/g, '""')}","${(l.title || "").replace(/"/g, '""')}","${new Date(l.timestamp).toISOString()}"`
      );
      return { text: "url,title,saved_at\n" + rows.join("\n"), file: "linkstash_export.csv", mime: "text/csv" };
    }
    case "md":
      return { text: links.map(l => `- [${l.title || l.url}](${l.url})`).join("\n"), file: "linkstash_export.md", mime: "text/markdown" };
    default:
      return { text: links.map(l => l.url).join("\n"), file: "linkstash_export.txt", mime: "text/plain" };
  }
}

// ──────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────
exportBtn.addEventListener("click", () => {
  if (currentLinks.length === 0) return;
  const { text, file, mime } = formatLinks(currentLinks, formatEl.value);
  const blob = new Blob([text], { type: mime });
  const objectUrl = URL.createObjectURL(blob);
  chrome.downloads.download({ url: objectUrl, filename: file, saveAs: true });
});

// ──────────────────────────────────────────────
// Copy
// ──────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  if (currentLinks.length === 0) return;
  const { text } = formatLinks(currentLinks, formatEl.value);

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
});

// ──────────────────────────────────────────────
// Undo
// ──────────────────────────────────────────────
undoBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "undo-last" }, (res) => {
    if (res && res.ok) {
      undoBtn.textContent = "Undone!";
      setTimeout(() => (undoBtn.textContent = "Undo"), 1000);
      refresh();
    }
  });
});

// ──────────────────────────────────────────────
// Clear All (double-click confirmation)
// ──────────────────────────────────────────────
let clearPending = false;
let clearTimer = null;

clearBtn.addEventListener("click", () => {
  if (currentLinks.length === 0) return;

  if (!clearPending) {
    clearPending = true;
    clearBtn.textContent = "Sure?";
    clearTimer = setTimeout(() => {
      clearPending = false;
      clearBtn.textContent = "Clear all";
    }, 2000);
  } else {
    clearPending = false;
    if (clearTimer) clearTimeout(clearTimer);
    chrome.storage.local.set({ savedLinks: [] }, () => {
      chrome.action.setBadgeText({ text: "" });
      clearBtn.textContent = "Clear all";
      refresh();
    });
  }
});

// ──────────────────────────────────────────────
// Live Updates
// ──────────────────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.savedLinks) renderLinks(changes.savedLinks.newValue || []);
  if (changes.enabled) toggleEl.checked = changes.enabled.newValue;
});

// ──────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────
refresh();
