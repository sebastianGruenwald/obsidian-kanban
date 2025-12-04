// View type constant
export const VIEW_TYPE_KANBAN = 'kanban-board-view';

// Frontmatter property keys
export const FRONTMATTER_KEYS = {
	ARCHIVED: 'archived',
	CARD_COLOR: 'cardColor',
	TAGS: 'tags',
	STATUS: 'status',
} as const;

// CSS Classes
export const CSS_CLASSES = {
	// Board
	KANBAN_HEADER: 'kanban-header',
	KANBAN_BOARD: 'kanban-board',
	KANBAN_BOARD_TITLE: 'kanban-board-title',
	KANBAN_BOARD_CONTROLS: 'kanban-board-controls',
	KANBAN_BOARD_SELECTOR: 'kanban-board-selector',
	KANBAN_ERROR: 'kanban-error',
	
	// Columns
	KANBAN_COLUMN: 'kanban-column',
	KANBAN_COLUMN_HEADER: 'kanban-column-header',
	KANBAN_COLUMN_TITLE: 'kanban-column-title',
	KANBAN_COLUMN_TITLE_CONTAINER: 'kanban-column-title-container',
	KANBAN_COLUMN_DRAG_HANDLE: 'kanban-column-drag-handle',
	KANBAN_COLUMN_COUNT: 'kanban-column-count',
	KANBAN_COLUMN_CONTENT: 'kanban-column-content',
	KANBAN_COLUMN_CONTROLS: 'kanban-column-controls',
	KANBAN_COLUMN_OPTIONS_BTN: 'kanban-column-options-btn',
	COLUMN_DRAGGING: 'column-dragging',
	COLUMN_DRAG_OVER: 'column-drag-over',
	DROP_TARGET_AVAILABLE: 'drop-target-available',
	
	// Cards
	KANBAN_CARD: 'kanban-card',
	KANBAN_CARD_TITLE: 'kanban-card-title',
	KANBAN_CARD_META: 'kanban-card-meta',
	KANBAN_CARD_DATE: 'kanban-card-date',
	KANBAN_CARD_TAGS: 'kanban-card-tags',
	KANBAN_CARD_PROPERTY: 'kanban-card-property',
	
	// Buttons
	KANBAN_ADD_CARD_BTN: 'kanban-add-card-btn',
	KANBAN_ADD_COLUMN_BTN: 'kanban-add-column-btn',
	KANBAN_REFRESH_BTN: 'kanban-refresh-btn',
	
	// Sort
	KANBAN_SORT_CONTAINER: 'kanban-sort-container',
	KANBAN_SORT_LABEL: 'kanban-sort-label',
	KANBAN_SORT_SELECTOR: 'kanban-sort-selector',
	KANBAN_SORT_ORDER_SELECTOR: 'kanban-sort-order-selector',
	
	// Drag and Drop
	DRAGGING: 'dragging',
	DRAG_OVER: 'drag-over'
} as const;

// Data Transfer Types
export const DRAG_TYPES = {
	FILE_PATH: 'text/plain',
	COLUMN_NAME: 'text/column-name'
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
	OPEN_KANBAN: 'open-kanban-board',
	SWITCH_BOARD: 'switch-kanban-board',
	REFRESH_BOARD: 'refresh-kanban-board',
	CREATE_BOARD: 'create-kanban-board',
	CREATE_CARD: 'create-kanban-card',
	SEARCH_CARDS: 'search-kanban-cards'
} as const;

// Icons
export const ICONS = {
	KANBAN: 'layout-dashboard',
	TRASH: 'trash',
	PENCIL: 'pencil',
	FILE: 'file-text',
	FILE_PLUS: 'file-plus',
	ARROW_RIGHT: 'arrow-right'
} as const;

// Default values
export const DEFAULTS = {
	COLUMN_MIN_WIDTH: 280,
	DEBOUNCE_DELAY: 300,
	UNCATEGORIZED_COLUMN: 'Uncategorized'
} as const;

// Sort options
export const SORT_OPTIONS = [
	{ value: 'none', text: 'No sorting' },
	{ value: 'creation', text: 'Created' },
	{ value: 'modification', text: 'Modified' },
	{ value: 'title', text: 'Title' }
] as const;

// Visible properties
export const AVAILABLE_PROPERTIES = ['title', 'created', 'modified', 'tags'] as const;
