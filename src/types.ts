export interface BoardConfig {
	id: string;
	name: string;
	tagFilter: string;
	columnProperty: string;
	defaultColumns: string[];
	customColumns: string[];
	columnWidths: Record<string, number>;
	columnOrder: string[];
	visibleProperties: string[];
	sortBy: 'creation' | 'modification' | 'title' | 'none' | string;
	sortOrder: 'asc' | 'desc';
	cardDensity: 'compact' | 'comfortable' | 'spacious';
	tagColors: Record<string, string>;
	showColumnBackgrounds: boolean;
	colorfulHeaders: boolean;
	showCardColors: boolean;
}

export interface KanbanSettings {
	boards: BoardConfig[];
	activeBoard: string;
	autoRefresh: boolean;
	showFileCount: boolean;
	cardTemplate: string;
	defaultVisibleProperties: string[];
}

export const DEFAULT_BOARD: BoardConfig = {
	id: 'default',
	name: 'Default Kanban',
	tagFilter: '#kanban',
	columnProperty: 'status',
	defaultColumns: ['To Do', 'In Progress', 'Done'],
	customColumns: [],
	columnWidths: {},
	columnOrder: [],
	visibleProperties: ['title', 'created'],
	sortBy: 'creation',
	sortOrder: 'desc',
	cardDensity: 'comfortable',
	tagColors: {},
	showColumnBackgrounds: false,
	colorfulHeaders: true,
	showCardColors: true
};

export const DEFAULT_SETTINGS: KanbanSettings = {
	boards: [DEFAULT_BOARD],
	activeBoard: 'default',
	autoRefresh: true,
	showFileCount: true,
	cardTemplate: '',
	defaultVisibleProperties: ['title', 'created', 'modified']
};

export interface KanbanCard {
	file: string;
	title: string;
	column: string;
	created: number;
	modified: number;
	content: string;
	frontmatter: Record<string, any>;
}