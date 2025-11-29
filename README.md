# Obsidian Kanban Board Plugin

A powerful plugin for Obsidian that creates customizable kanban boards from notes with specific tags and frontmatter properties.

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

1. Install the plugin in Obsidian.
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
3. Open kanban board from ribbon or command palette.
4. Drag cards between columns or use the + button to create new cards.

## 📚 Documentation

- **[Installation Guide](docs/INSTALL.md)**: Detailed instructions for BRAT, Manual, and Source installation.
- **[Examples](docs/EXAMPLES.md)**: Detailed usage examples and board configurations.
- **[Development Guide](docs/DEVELOPMENT.md)**: Instructions for building and releasing the plugin.

## 🔄 Changelog

See `CHANGELOG.md` for version history and updates.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests.

## 📄 License

MIT License - see LICENSE file for details.
