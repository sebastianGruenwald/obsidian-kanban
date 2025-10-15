# Obsidian Kanban Board Plugin

A plugin for Obsidian that creates kanban boards from notes with specific tags and frontmatter properties.

## Features

- Create kanban boards from notes with specific tags (e.g., `#kanban`)
- Define columns using frontmatter properties
- Drag and drop cards between columns
- Sort and filter cards by various criteria (creation date, etc.)
- Store column order and layout in plugin settings
- Auto-refresh when files change

## Installation

1. Download the plugin files
2. Place them in your vault's `.obsidian/plugins/kanban-board/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

## Usage

1. Add the tag you configured (default: `#kanban`) to notes you want to include in the kanban board
2. Add a frontmatter property to define the column (default property: `status`)
3. Open the kanban board view from the ribbon or command palette

Example note:
```markdown
---
status: "In Progress"
---

# My Task

This is a task that should appear in the kanban board.

#kanban
```

## Settings

- **Tag Filter**: The tag to filter notes by (default: `#kanban`)
- **Column Property**: The frontmatter property that defines the column (default: `status`)
- **Default Columns**: Predefined columns that will always appear
- **Sort Options**: Configure how cards are sorted within columns

## Development

```bash
npm install
npm run dev
```