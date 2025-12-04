import { KanbanSettings, BoardConfig, DEFAULT_SETTINGS, DEFAULT_BOARD } from './types';

export interface Migration {
	version: number;
	description: string;
	migrate: (settings: any) => any;
}

export class SettingsMigrator {
	private migrations: Migration[] = [
		{
			version: 1,
			description: 'Add imageDisplayMode and imageProperties',
			migrate: (settings: any) => {
				if (settings.boards) {
					settings.boards = settings.boards.map((board: any) => ({
						...board,
						imageDisplayMode: board.imageDisplayMode || 'cover',
						imageProperties: board.imageProperties || ['cover', 'image', 'thumbnail', 'banner'],
					}));
				}
				return settings;
			},
		},
		{
			version: 2,
			description: 'Add theme property',
			migrate: (settings: any) => {
				if (settings.boards) {
					settings.boards = settings.boards.map((board: any) => ({
						...board,
						theme: board.theme || 'default',
					}));
				}
				return settings;
			},
		},
		{
			version: 3,
			description: 'Add settings version tracking',
			migrate: (settings: any) => {
				return {
					...settings,
					version: 3,
				};
			},
		},
	];

	/**
	 * Migrate settings from old version to current
	 */
	migrate(loadedSettings: any): KanbanSettings {
		let settings = { ...loadedSettings };
		const currentVersion = settings.version || 0;
		const latestVersion = this.getLatestVersion();

		// Apply migrations in sequence
		if (currentVersion < latestVersion) {
			console.log(`[Kanban] Migrating settings from v${currentVersion} to v${latestVersion}`);
			
			for (const migration of this.migrations) {
				if (migration.version > currentVersion) {
					console.log(`[Kanban] Applying migration v${migration.version}: ${migration.description}`);
					try {
						settings = migration.migrate(settings);
					} catch (error) {
						console.error(`[Kanban] Migration v${migration.version} failed:`, error);
						// Continue with other migrations
					}
				}
			}
		}

		// Ensure we have valid settings structure
		return this.ensureValidSettings(settings);
	}

	/**
	 * Ensure settings have all required properties with defaults
	 */
	private ensureValidSettings(settings: any): KanbanSettings {
		const validSettings: KanbanSettings = {
			boards: this.ensureValidBoards(settings.boards),
			activeBoard: settings.activeBoard || DEFAULT_SETTINGS.activeBoard,
			autoRefresh: settings.autoRefresh ?? DEFAULT_SETTINGS.autoRefresh,
			showFileCount: settings.showFileCount ?? DEFAULT_SETTINGS.showFileCount,
			cardTemplate: settings.cardTemplate || DEFAULT_SETTINGS.cardTemplate,
			defaultVisibleProperties: settings.defaultVisibleProperties || DEFAULT_SETTINGS.defaultVisibleProperties,
		};

		// Ensure active board exists
		if (!validSettings.boards.find(b => b.id === validSettings.activeBoard)) {
			validSettings.activeBoard = validSettings.boards[0]?.id || DEFAULT_SETTINGS.activeBoard;
		}

		return validSettings;
	}

	/**
	 * Ensure boards array is valid
	 */
	private ensureValidBoards(boards: any): BoardConfig[] {
		if (!Array.isArray(boards) || boards.length === 0) {
			return [DEFAULT_BOARD];
		}

		return boards.map(board => this.ensureValidBoard(board));
	}

	/**
	 * Ensure a single board has all required properties
	 */
	private ensureValidBoard(board: any): BoardConfig {
		return {
			id: board.id || DEFAULT_BOARD.id,
			name: board.name || DEFAULT_BOARD.name,
			tagFilter: board.tagFilter || DEFAULT_BOARD.tagFilter,
			columnProperty: board.columnProperty || DEFAULT_BOARD.columnProperty,
			defaultColumns: Array.isArray(board.defaultColumns) ? board.defaultColumns : DEFAULT_BOARD.defaultColumns,
			customColumns: Array.isArray(board.customColumns) ? board.customColumns : DEFAULT_BOARD.customColumns,
			columnWidths: board.columnWidths || DEFAULT_BOARD.columnWidths,
			columnOrder: Array.isArray(board.columnOrder) ? board.columnOrder : DEFAULT_BOARD.columnOrder,
			visibleProperties: Array.isArray(board.visibleProperties) ? board.visibleProperties : DEFAULT_BOARD.visibleProperties,
			sortBy: board.sortBy || DEFAULT_BOARD.sortBy,
			sortOrder: board.sortOrder || DEFAULT_BOARD.sortOrder,
			cardDensity: board.cardDensity || DEFAULT_BOARD.cardDensity,
			tagColors: board.tagColors || DEFAULT_BOARD.tagColors,
			showColumnBackgrounds: board.showColumnBackgrounds ?? DEFAULT_BOARD.showColumnBackgrounds,
			colorfulHeaders: board.colorfulHeaders ?? DEFAULT_BOARD.colorfulHeaders,
			showCardColors: board.showCardColors ?? DEFAULT_BOARD.showCardColors,
			wipLimits: board.wipLimits || DEFAULT_BOARD.wipLimits,
			cardAging: board.cardAging ?? DEFAULT_BOARD.cardAging,
			cardAgingThreshold: board.cardAgingThreshold || DEFAULT_BOARD.cardAgingThreshold,
			autoMoveCompleted: board.autoMoveCompleted ?? DEFAULT_BOARD.autoMoveCompleted,
			autoArchiveDelay: board.autoArchiveDelay || DEFAULT_BOARD.autoArchiveDelay,
			swimlaneProperty: board.swimlaneProperty || DEFAULT_BOARD.swimlaneProperty,
			imageDisplayMode: board.imageDisplayMode || DEFAULT_BOARD.imageDisplayMode,
			imageProperties: Array.isArray(board.imageProperties) ? board.imageProperties : DEFAULT_BOARD.imageProperties,
			theme: board.theme || DEFAULT_BOARD.theme,
		};
	}

	/**
	 * Get the latest migration version
	 */
	private getLatestVersion(): number {
		return this.migrations.length > 0
			? Math.max(...this.migrations.map(m => m.version))
			: 0;
	}

	/**
	 * Validate settings before saving
	 */
	validateSettings(settings: KanbanSettings): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Validate boards
		if (!settings.boards || settings.boards.length === 0) {
			errors.push('At least one board is required');
		}

		settings.boards?.forEach((board, index) => {
			if (!board.id) {
				errors.push(`Board ${index + 1}: Missing ID`);
			}
			if (!board.name || board.name.trim().length === 0) {
				errors.push(`Board ${index + 1}: Missing or empty name`);
			}
			if (!board.tagFilter || !board.tagFilter.startsWith('#')) {
				errors.push(`Board ${index + 1}: Tag filter must start with #`);
			}
			if (!board.columnProperty || board.columnProperty.trim().length === 0) {
				errors.push(`Board ${index + 1}: Missing column property`);
			}
		});

		// Validate active board
		if (settings.activeBoard && !settings.boards?.find(b => b.id === settings.activeBoard)) {
			errors.push('Active board does not exist');
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}
}

// Export singleton instance
export const settingsMigrator = new SettingsMigrator();
