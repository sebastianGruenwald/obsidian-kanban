# Obsidian Kanban Board Plugin

![Obsidian Kanban Board](docs/screenshot_assets/kanban_board.png)

[![CI](https://github.com/sebastianGruenwald/obsidian-kanban/actions/workflows/ci.yml/badge.svg)](https://github.com/sebastianGruenwald/obsidian-kanban/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

A powerful, flexible kanban board plugin for Obsidian that transforms your tagged notes into visual task management boards.

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
   tags: ["project-alpha"]
   ---
   ```
3. Open kanban board from ribbon or command palette.
4. Drag cards between columns or use the + button to create new cards.

## 📚 Documentation

- **[Installation Guide](INSTALL.md)**: Detailed instructions for BRAT, Manual, and Source installation
- **[Examples](docs/EXAMPLES.md)**: Detailed usage examples and board configurations
- **[Development Guide](docs/DEVELOPMENT.md)**: Instructions for building and releasing the plugin
- **[API Documentation](docs/API.md)**: Complete API reference for extending the plugin
- **[Contributing Guide](CONTRIBUTING.md)**: Guidelines for contributing to the project

## 🏗️ Architecture

This plugin is built with:
- **TypeScript** with strict type checking
- **Centralized error handling** for robust operation
- **Service layer architecture** for maintainability
- **Comprehensive test coverage** with Vitest
- **Accessibility** features (ARIA labels, keyboard navigation)
- **State management** for reactive UI updates
- **Data caching** for improved performance

## 🔄 Changelog

See `CHANGELOG.md` for version history and updates.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see LICENSE file for details.
