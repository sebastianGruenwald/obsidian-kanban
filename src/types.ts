export interface BoardConfig {
	id: string;
	name: string;
	tagFilter: string;
	columnProperty: string;
	defaultColumns: string[];
	customColumns: string[];
	columnOrder: string[];
	visibleProperties: string[];
	sortBy: 'creation' | 'modification' | 'title' | 'none';
	sortOrder: 'asc' | 'desc';
}

export interface KanbanSettings {
	boards: BoardConfig[];
	activeBoard: string;
	autoRefresh: boolean;
	showFileCount: boolean;
	defaultVisibleProperties: string[];
}

export const DEFAULT_BOARD: BoardConfig = {
	id: 'default',
	name: 'Default Kanban',
	tagFilter: '#kanban',
	columnProperty: 'status',
	defaultColumns: ['To Do', 'In Progress', 'Done'],
	customColumns: [],
	columnOrder: [],
	visibleProperties: ['title', 'created'],
	sortBy: 'creation',
	sortOrder: 'desc'
};

export const DEFAULT_SETTINGS: KanbanSettings = {
	boards: [DEFAULT_BOARD],
	activeBoard: 'default',
	autoRefresh: true,
	showFileCount: true,
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