# Installation Guide

## Method 1: BRAT (Recommended for Beta Testing)

**BRAT** (Beta Reviewer's Auto-update Tool) is the easiest way to install and keep the plugin updated.

### Prerequisites
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's Community Plugins.

### Installation Steps
1. Open Obsidian Command Palette (`Ctrl/Cmd + P`).
2. Run: **"BRAT: Add a beta plugin for testing"**.
3. Paste this repository URL: `https://github.com/waschtlgrea/obsidian-kanban`.
4. Click **"Add Plugin"**.
5. Enable the plugin in Settings → Community Plugins.

### Benefits
- ✅ **Auto-updates** when new versions are released.
- ✅ **Easy installation** - no manual file management.
- ✅ **Beta access** to latest features.

---

## Method 2: Manual Installation

### Download from Releases
1. Go to the [Releases page](https://github.com/waschtlgrea/obsidian-kanban/releases).
2. Download the latest `obsidian-kanban.zip` (or individual files: `main.js`, `manifest.json`, `styles.css`).
3. Create a folder: `<VaultName>/.obsidian/plugins/kanban-board/`.
4. Extract/Copy the files into this folder.
5. Restart Obsidian (or reload plugins).
6. Enable the plugin in Settings → Community Plugins.

---

## Method 3: Build from Source

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Steps
1. **Clone the repository**
   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone https://github.com/waschtlgrea/obsidian-kanban.git kanban-board
   cd kanban-board
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the plugin**
   ```bash
   npm run build
   ```

4. **Enable in Obsidian**
   - Go to Settings → Community Plugins.
   - Find "Kanban Board" and enable it.

---

## Troubleshooting

### Plugin Not Showing Up
- Ensure all required files (`main.js`, `manifest.json`, `styles.css`) are present.
- Check that the plugin folder is named exactly `kanban-board`.
- Restart Obsidian after installation.

### BRAT Installation Issues
- Make sure BRAT plugin is installed and enabled.
- Verify the repository URL is correct.
- Try manually refreshing BRAT's plugin list.

### Plugin Won't Enable
- Check the console for error messages (Ctrl/Cmd + Shift + I).
- Try disabling and re-enabling the plugin.
- Verify your Obsidian version meets the minimum requirement.
