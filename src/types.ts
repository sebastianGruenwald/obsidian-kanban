export interface KanbanSettings {
	tagFilter: string;
	columnProperty: string;
	defaultColumns: string[];
	sortBy: 'creation' | 'modification' | 'title' | 'none';
	sortOrder: 'asc' | 'desc';
	columnOrder: string[];
	autoRefresh: boolean;
	showFileCount: boolean;
}

export const DEFAULT_SETTINGS: KanbanSettings = {
	tagFilter: '#kanban',
	columnProperty: 'status',
	defaultColumns: ['To Do', 'In Progress', 'Done'],
	sortBy: 'creation',
	sortOrder: 'desc',
	columnOrder: [],
	autoRefresh: true,
	showFileCount: true
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