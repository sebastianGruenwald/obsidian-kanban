# Kanban Plugin API Documentation

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Services](#services)
- [Type Definitions](#type-definitions)
- [Extension Points](#extension-points)
- [Examples](#examples)

## Overview

The Obsidian Kanban plugin provides a flexible, tag-based kanban board system for managing notes within Obsidian. This document describes the plugin's architecture and provides guidance for extending or integrating with it.

## Core Components

### KanbanPlugin

The main plugin class that manages the plugin lifecycle.

```typescript
class KanbanPlugin extends Plugin {
	settings: KanbanSettings;
	boardManager: BoardManager;
	
	// Public methods
	async loadSettings(): Promise<void>;
	async saveSettings(): Promise<void>;
	async activateView(): Promise<void>;
	refreshAllViews(): void;
	debouncedRefresh(): void;
}
```

### BoardManager

Manages board configurations and operations.

```typescript
class BoardManager {
	getBoard(boardId: string): BoardConfig | null;
	getAllBoards(): BoardConfig[];
	addBoard(board: BoardConfig): void;
	updateBoard(boardId: string, updates: Partial<BoardConfig>): BoardConfig | null;
	deleteBoard(boardId: string): boolean;
	createNewBoard(name: string, tagFilter: string): BoardConfig;
}
```

**Example:**
```typescript
// Get current board
const board = plugin.boardManager.getBoard(plugin.settings.activeBoard);

// Create new board
const newBoard = plugin.boardManager.createNewBoard('My Project', '#project');
plugin.boardManager.addBoard(newBoard);
await plugin.saveSettings();
```

### DataManager

Handles data operations for cards.

```typescript
class DataManager {
	async getKanbanCards(): Promise<KanbanCard[]>;
	getColumns(cards: KanbanCard[]): string[];
	async updateCardColumn(cardPath: string, newColumn: string): Promise<void>;
	async archiveCard(cardPath: string): Promise<void>;
	async createNewCard(columnName: string, title: string, cardColor?: string): Promise<void>;
}
```

**Example:**
```typescript
// Fetch all cards for current board
const cards = await dataManager.getKanbanCards();

// Create a new card
await dataManager.createNewCard('To Do', 'My Task', 'yellow');

// Move a card
await dataManager.updateCardColumn('tasks/my-task.md', 'In Progress');
```

## Services

### ErrorHandler

Centralized error handling service.

```typescript
class ErrorHandler {
	handle(error: unknown, options: ErrorOptions): void;
	handleAndThrow(error: unknown, options: Omit<ErrorOptions, 'showToUser'>): never;
	wrap<T>(fn: T, options: Omit<ErrorOptions, 'showToUser'>): T;
	getRecentErrors(count?: number): Array<{ timestamp: number; context: string; error: Error }>;
}
```

**Example:**
```typescript
import { errorHandler } from './errorHandler';

try {
	await someOperation();
} catch (error) {
	errorHandler.handle(error, {
		context: 'card-creation',
		action: 'Creating new card',
		showToUser: true
	});
}
```

### SearchFilterService

Provides card filtering capabilities.

```typescript
class SearchFilterService {
	filterCards(cards: KanbanCard[], options: SearchFilterOptions): KanbanCard[];
	getAllTags(cards: KanbanCard[]): string[];
	getTagStatistics(cards: KanbanCard[]): Map<string, number>;
}
```

**Example:**
```typescript
const searchFilter = new SearchFilterService();

// Filter by search query
const filtered = searchFilter.filterCards(cards, {
	searchQuery: 'urgent',
	selectedTags: new Set(['work'])
});

// Get all tags
const tags = searchFilter.getAllTags(cards);
```

## Type Definitions

### BoardConfig

Configuration for a kanban board.

```typescript
interface BoardConfig {
	id: string;
	name: string;
	tagFilter: string;
	columnProperty: string;
	defaultColumns: string[];
	customColumns: string[];
	columnOrder: string[];
	visibleProperties: string[];
	sortBy: 'creation' | 'modification' | 'title' | 'none' | string;
	sortOrder: 'asc' | 'desc';
	cardDensity: 'compact' | 'comfortable' | 'spacious';
	showCardColors: boolean;
	wipLimits: Record<string, number>;
	theme: 'default' | 'sticky-notes';
	// ... more properties
}
```

### KanbanCard

Represents a card in the kanban board.

```typescript
interface KanbanCard {
	file: string;
	title: string;
	column: string;
	created: number;
	modified: number;
	content: string;
	frontmatter: CardFrontmatter;
}

interface CardFrontmatter {
	status?: string;
	tags?: string | string[];
	cardColor?: string;
	archived?: boolean;
	[key: string]: unknown;
}
```

### KanbanSettings

Global plugin settings.

```typescript
interface KanbanSettings {
	boards: BoardConfig[];
	activeBoard: string;
	autoRefresh: boolean;
	showFileCount: boolean;
	cardTemplate: string;
	defaultVisibleProperties: string[];
}
```

## Extension Points

### Creating Custom Board Themes

Add custom CSS classes to implement new themes:

```css
/* In your custom CSS snippet */
.theme-my-custom-theme .kanban-card {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: white;
	border-radius: 12px;
}
```

Then add the theme option to your board configuration.

### Adding Custom Card Properties

```typescript
// In your note's frontmatter
---
status: In Progress
priority: high
assignee: John Doe
custom-field: Custom Value
---
```

Configure the board to display custom properties:

```typescript
board.visibleProperties = ['title', 'priority', 'assignee', 'custom-field'];
```

### Custom Automation

Extend the DataManager to add custom automation rules:

```typescript
class CustomDataManager extends DataManager {
	async runAutomations(cards: KanbanCard[]): Promise<void> {
		await super.runAutomations(cards);
		
		// Custom automation: Auto-assign cards
		for (const card of cards) {
			if (!card.frontmatter.assignee && card.frontmatter.priority === 'high') {
				await this.autoAssign(card);
			}
		}
	}
	
	private async autoAssign(card: KanbanCard): Promise<void> {
		// Implementation
	}
}
```

## Examples

### Example 1: Creating a Project Board

```typescript
// Create a new board for a project
const projectBoard = plugin.boardManager.createNewBoard(
	'Project Alpha',
	'#project-alpha'
);

// Configure columns
projectBoard.defaultColumns = ['Backlog', 'In Progress', 'Review', 'Done'];
projectBoard.columnProperty = 'status';

// Set WIP limits
projectBoard.wipLimits = {
	'In Progress': 3,
	'Review': 2
};

// Add board
plugin.boardManager.addBoard(projectBoard);
await plugin.saveSettings();
```

### Example 2: Batch Card Creation

```typescript
const tasks = [
	{ title: 'Design mockups', column: 'Backlog' },
	{ title: 'Setup database', column: 'Backlog' },
	{ title: 'Implement API', column: 'Backlog' }
];

for (const task of tasks) {
	await dataManager.createNewCard(task.column, task.title);
}

plugin.refreshAllViews();
```

### Example 3: Custom Filter

```typescript
const searchFilter = new SearchFilterService();

// Find all high-priority cards created this week
const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

const highPriorityCards = searchFilter.filterCards(cards, {
	searchQuery: 'priority: high',
	dateRange: { start: oneWeekAgo }
});

console.log(`Found ${highPriorityCards.length} high-priority cards`);
```

### Example 4: State Management

```typescript
// Create state manager for a custom view
const viewState = new ViewStateManager();

// Subscribe to changes
viewState.subscribe(state => {
	if (state.isLoading) {
		showLoadingSpinner();
	} else {
		hideLoadingSpinner();
		renderCards(state.cards);
	}
});

// Load data
viewState.setLoading(true);
const cards = await dataManager.getKanbanCards();
viewState.setCards(cards);
viewState.setLoading(false);
```

## Best Practices

1. **Error Handling**: Always use the ErrorHandler service for consistent error management
2. **State Management**: Use ViewStateManager for reactive UI updates
3. **Caching**: Leverage DataCacheService for performance optimization
4. **Validation**: Validate board configurations before saving
5. **Accessibility**: Add proper ARIA labels to custom UI elements
6. **Testing**: Write tests for custom components and services

## Migration Guide

If you're migrating from an older version:

```typescript
// Old way
try {
	await operation();
} catch (error) {
	console.error('Error:', error);
	new Notice('Operation failed');
}

// New way
try {
	await operation();
} catch (error) {
	errorHandler.handle(error, {
		context: 'operation',
		action: 'Performing operation'
	});
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the plugin.

## License

MIT License - see [LICENSE](../LICENSE) for details.
