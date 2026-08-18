# Save Middle-Click Links (v2.0.0)

A sleek, feature-packed browser extension that intercepts **Alt + Clicks** on links to effortlessly save and organize URLs into a collection without opening new tabs.

---

## ✨ Features

- **⚡ Quick Link Capture**: Simply **Alt + Left Click** on any hyperlink to instantly save the link and title.
- **🍞 Visual Toast Notifications**: Displays smooth on-page feedback when a link is saved or if it was already in your list.
- **🚫 Duplicate Detection**: Automatically prevents duplicate URLs from cluttering your list.
- **🔍 Search & Filter**: Real-time search bar in the popup to quickly find links by domain, page title, or URL path.
- **📦 Multi-Format Export**: Download your saved links in multiple formats:
  - **TXT** (Plain URL list)
  - **JSON** (Full data with titles and timestamps)
  - **CSV** (Spreadsheet-friendly)
  - **Markdown** (Formatted list with clickable markdown links)
- **📋 1-Click Clipboard Copy**: Copy all your saved links in any selected format straight to your clipboard.
- **↩️ Undo & Individual Delete**: Remove single links directly from the list or use the **Undo** button to revert your last save.
- **🎨 Custom UI Themes**: Switch between **Light**, **Dark**, **Y2K**, and **Glassmorphism** styles.
- **⏸️ Quick Enable/Disable Toggle**: Pause link interception anytime from the header switch without uninstalling.
- **🔢 Live Badge Counter**: Keeps track of your saved count directly on the extension icon badge (displays `OFF` when paused).

---

## 🚀 Installation

To install this extension in any Chromium-based browser (Chrome, Edge, Brave, Opera, Arc):

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/murtaza550/SaveMiddleClickLinks.git
   ```
   *(Or download the ZIP and extract it to a folder).*

2. **Load into Browser:**
   - Open your browser and navigate to `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
   - Enable **Developer mode** (toggle in the top-right corner).
   - Click **Load unpacked**.
   - Select the `SaveMiddleClickLinks` folder.

---

## 📖 How to Use

1. **Save a Link**: Hold <kbd>Alt</kbd> and **left-click** any link on any webpage. A confirmation toast will appear.
2. **Open Saved Links**: Click the extension icon in your browser toolbar to view your saved links with relative timestamps and domain badges.
3. **Search**: Type in the search box to filter links on the fly.
4. **Export / Copy**: Choose your preferred format from the dropdown (`TXT`, `JSON`, `CSV`, `MD`), then click **Export** to download or **Copy** to clipboard.
5. **Manage Links**: 
   - Click the **✕** button on any link to delete it.
   - Click **Undo** to remove the most recent link.
   - Click **Clear all** (confirm by clicking twice) to wipe your list.

---

## 📁 Project Structure

- `manifest.json`: Manifest V3 extension configuration and permissions.
- `background.js`: Service worker handling local storage, badge counts, migration, and state toggles.
- `content.js`: Content script injected into pages to intercept Alt+clicks and show toast feedback.
- `popup.html`: Modern, responsive popup interface supporting multiple visual themes.
- `popup.js`: Popup logic for search, themes, rendering, formatting, and clipboard/download exports.

