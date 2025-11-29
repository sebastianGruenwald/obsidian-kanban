# Obsidian Kanban Board Plugin

A powerful plugin for Obsidian that creates customizable kanban boards from notes with specific tags and frontmatter properties.

## 📦 Installation

### Option 1: BRAT (Beta Reviewer's Auto-update Tool)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) if you haven't already
2. Open the command palette and run "BRAT: Add a beta plugin for testing"
3. Enter this repository URL: `https://github.com/waschtlgrea/obsidian-kanban`
4. Click "Add Plugin" - BRAT will install and enable the plugin

### Option 2: Manual Installation
1. Download the latest release from the [Releases page](https://github.com/waschtlgrea/obsidian-kanban/releases)
2. Extract the files to your vault's `.obsidian/plugins/kanban-board/` folder
3. Enable the plugin in Settings → Community Plugins

### Option 3: From Source
1. Clone this repository into your vault's plugins folder
2. Run `npm install` and `npm run build`
3. Enable the plugin in Obsidian settings

## 🎯 Features

### Multiple Boards
- **Multiple kanban boards** with different tag filters
- **Board switching** via dropdown selector
- **Board-specific settings** and configurations
- **Independent column management** per board

### Dynamic Columns
- **Frontmatter-based columns** using any property
- **Add/remove custom columns** per board
- **Default columns** that always appear
- **Column ordering** and layout persistence

### Card Management
- **Drag and drop** cards between columns
- **Create new cards** with + button in column headers
- **Configurable card properties** (what to display on cards)
- **Sort and filter** cards by various criteria

### Customization
- **Visible properties** per board (creation date, tags, custom fields)
- **Auto-refresh** when files change
- **Responsive design** for mobile and desktop
- **Theme-aware** styling

## 🚀 Quick Start

1. Install the plugin in Obsidian
2. Create notes with:
   ```yaml
   ---
   status: "In Progress"
   priority: "high"
   ---
   
   # My Task
   Task description here.
   
   #kanban
   ```
3. Open kanban board from ribbon or command palette
4. Drag cards between columns or use the + button to create new cards

## 📋 Usage

### Creating Boards
1. Go to Settings → Kanban Board
2. Click "Create Board"
3. Set a name and tag filter (e.g., `#project-alpha`)
4. Configure columns and visible properties

### Managing Columns
- **Add columns**: Use + button in column headers or settings
- **Remove columns**: Right-click column header → Delete (custom columns only)
- **Reorder columns**: Drag and drop (coming soon) or configure in settings

### Card Properties
Configure which frontmatter properties appear on cards:
- Title (always shown)
- Creation/modification dates
- Tags
- Custom frontmatter fields

### Example Board Configurations

**Project Management Board**
- Tag: `#project`
- Columns: `Backlog`, `In Progress`, `Review`, `Done`
- Properties: `title`, `created`, `assignee`, `priority`

**Content Creation Board**
- Tag: `#content`
- Columns: `Ideas`, `Writing`, `Review`, `Published`
- Properties: `title`, `created`, `tags`, `word-count`

## ⚙️ Settings

### Board Management
- Create/delete boards
- Switch between boards
- Configure board-specific settings

### Column Configuration
- Set default columns
- Add/remove custom columns
- Configure column property name

### Display Options
- Choose visible card properties
- Show/hide file counts
- Enable auto-refresh
- Sort options (creation date, title, etc.)

## 🔧 Installation

### Manual Installation
1. Download `main.js`, `manifest.json`, and `styles.css`
2. Create folder: `<vault>/.obsidian/plugins/kanban-board/`
3. Copy files to this folder
4. Enable plugin in Settings → Community Plugins

### Development
```bash
git clone <repository>
cd obsidian-kanban
npm install
npm run dev
```

## 🎨 Customization

### Custom Styling
Add CSS snippets to customize appearance:
```css
.kanban-card {
    /* Your custom card styling */
}

.kanban-column {
    /* Your custom column styling */
}
```

### Board Templates
Create template boards for different use cases:
- Personal task management
- Team project tracking
- Content pipeline management
- Study/research organization

## 📖 Examples

See `EXAMPLES.md` for detailed usage examples and board configurations.

## 🔄 Changelog

See `CHANGELOG.md` for version history and updates.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.