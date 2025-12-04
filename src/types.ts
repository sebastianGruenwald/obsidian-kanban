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
	wipLimits: Record<string, number>;
	cardAging: boolean;
	cardAgingThreshold: number;
	autoMoveCompleted: boolean; // Move to last column when all subtasks checked
	autoArchiveDelay: number; // Archive cards in last column after X days (0 to disable)
	swimlaneProperty: string | null; // Property to use for swimlanes (null to disable)
	imageDisplayMode: 'cover' | 'thumbnail'; // How to display image properties
	imageProperties: string[]; // Properties that contain images
	theme: 'default' | 'sticky-notes'; // Board theme
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
	showCardColors: true,
	wipLimits: {},
	cardAging: false,
	cardAgingThreshold: 7,
	autoMoveCompleted: false,
	autoArchiveDelay: 0,
	swimlaneProperty: null,
	imageDisplayMode: 'cover',
	imageProperties: ['cover', 'image', 'thumbnail', 'banner'],
	theme: 'default'
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
	content?: string;
	dueDate?: number;
	frontmatter: Record<string, any>;
}