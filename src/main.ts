import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { KanbanSettings, DEFAULT_SETTINGS } from './types';
import { KanbanSettingTab } from './settings';
import { KanbanView, VIEW_TYPE_KANBAN } from './kanbanView';
import { BoardManager } from './boardManager';
import { debounce, getAllTags, showError, showInfo } from './utils';
import { DEFAULTS, KEYBOARD_SHORTCUTS, ICONS } from './constants';

// Extend the App interface to include the trigger method for style-settings
declare module 'obsidian' {
	interface Workspace {
		trigger(name: 'parse-style-settings'): void;
	}
}

export default class KanbanPlugin extends Plugin {
	settings!: KanbanSettings;
	boardManager!: BoardManager;
	private views: Set<KanbanView> = new Set();
	private debouncedRefreshInternal!: () => void;

	async onload() {
		await this.loadSettings();
		this.boardManager = new BoardManager(this.settings.boards);

		// Initialize debounced refresh
		this.debouncedRefreshInternal = debounce(
			() => this.refreshAllViews(),
			DEFAULTS.DEBOUNCE_DELAY
		);

		// Register the kanban view
		this.registerView(
			VIEW_TYPE_KANBAN,
			(leaf) => {
				const view = new KanbanView(leaf, this);
				this.views.add(view);
				
				// Clean up when view is closed
				this.registerEvent(
					this.app.workspace.on('layout-change', () => {
						// Remove views that are no longer in the workspace
						const activeViews = new Set<KanbanView>();
						this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN).forEach(leaf => {
							const view = leaf.view;
							if (view instanceof KanbanView) {
								activeViews.add(view);
							}
						});
						
						// Remove views that are no longer active
						this.views.forEach(view => {
							if (!activeViews.has(view)) {
								this.views.delete(view);
							}
						});
					})
				);
				
				return view;
			}
		);

		// Add ribbon icon
		this.addRibbonIcon(ICONS.KANBAN, 'Open Kanban Board', () => {
			this.activateView();
		});

		// Add command to open kanban board
		this.addCommand({
			id: KEYBOARD_SHORTCUTS.OPEN_KANBAN,
			name: 'Open Kanban Board',
			callback: () => {
				this.activateView();
			}
		});

		// Add command to switch boards
		this.addCommand({
			id: KEYBOARD_SHORTCUTS.SWITCH_BOARD,
			name: 'Switch Kanban Board',
			callback: () => {
				this.showBoardSwitcher();
			}
		});

		// Add command to refresh kanban board
		this.addCommand({
			id: KEYBOARD_SHORTCUTS.REFRESH_BOARD,
			name: 'Refresh Kanban Board',
			callback: () => {
				this.refreshAllViews();
			}
		});

		// Add command to create new board
		this.addCommand({
			id: KEYBOARD_SHORTCUTS.CREATE_BOARD,
			name: 'Create New Kanban Board',
			callback: () => {
				this.createNewBoard();
			}
		});

		// Add command to create new card
		this.addCommand({
			id: KEYBOARD_SHORTCUTS.CREATE_CARD,
			name: 'Create New Kanban Card',
			callback: () => {
				// This will be handled by the active view
				showInfo('Open a kanban board and use the + button in a column');
			}
		});

		// Register settings tab
		this.addSettingTab(new KanbanSettingTab(this.app, this));

		// Notify Style Settings plugin that we have settings to parse
		this.app.workspace.trigger('parse-style-settings');

		// Auto-refresh on file changes
		if (this.settings.autoRefresh) {
			this.registerEvent(
				this.app.vault.on('modify', (file) => {
					if (this.isRelevantFile(file)) {
						this.debouncedRefresh();
					}
				})
			);

			this.registerEvent(
				this.app.vault.on('create', (file) => {
					if (this.isRelevantFile(file)) {
						this.debouncedRefresh();
					}
				})
			);

			this.registerEvent(
				this.app.vault.on('delete', (file) => {
					if (this.isRelevantFile(file)) {
						this.debouncedRefresh();
					}
				})
			);

			this.registerEvent(
				this.app.metadataCache.on('changed', (file) => {
					if (this.isRelevantFile(file)) {
						this.debouncedRefresh();
					}
				})
			);
		}

		console.log('Kanban Board plugin loaded');
	}

	onunload() {
		// Clear all views
		this.views.clear();
		
		// Remove styles
		const styleEl = document.getElementById('kanban-board-styles');
		if (styleEl) {
			styleEl.remove();
		}
		console.log('Kanban Board plugin unloaded');
	}

	/**
	 * Check if a file is relevant for kanban boards
	 */
	private isRelevantFile(file: unknown): file is TFile {
		if (!(file instanceof TFile) || file.extension !== 'md') {
			return false;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return false;

		const tags = getAllTags(cache);
		
		// Check if file has any of the board tags
		const boards = this.boardManager.getAllBoards();
		return boards.some(board => tags.includes(board.tagFilter));
	}

	async loadSettings() {
		try {
			const loadedData = await this.loadData();
			this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
			
			// Ensure we have at least one board
			if (!this.settings.boards || this.settings.boards.length === 0) {
				this.settings.boards = [DEFAULT_SETTINGS.boards[0]];
			}
			
			// Ensure active board exists
			if (!this.settings.activeBoard || !this.settings.boards.find(b => b.id === this.settings.activeBoard)) {
				this.settings.activeBoard = this.settings.boards[0].id;
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
			this.settings = DEFAULT_SETTINGS;
			showError('Failed to load settings, using defaults');
		}
	}

	async saveSettings() {
		try {
			// Update the board manager's boards with current settings
			this.settings.boards = this.boardManager.getAllBoards();
			await this.saveData(this.settings);
		} catch (error) {
			console.error('Failed to save settings:', error);
			showError('Failed to save settings');
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_KANBAN);

		if (leaves.length > 0) {
			// A kanban view already exists, use the first one
			leaf = leaves[0];
		} else {
			// No kanban view exists, create a new one
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshAllViews() {
		for (const view of this.views.values()) {
			view.refresh();
		}
	}

	// Public method for settings to trigger debounced refresh
	debouncedRefresh() {
		if (this.debouncedRefreshInternal) {
			this.debouncedRefreshInternal();
		}
	}

	private showBoardSwitcher() {
		// Create a simple suggester for board switching
		// This could be enhanced with a proper modal in the future
		const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
		showInfo(`Current board: ${currentBoard?.name || 'Unknown'}. Use settings to switch boards.`);
	}

	private async createNewBoard() {
		// This could be enhanced with a proper modal
		// For now, users can create boards through settings
		showInfo('Use the settings panel to create new boards.');
	}

	// Helper method to update column order in settings
	async updateColumnOrder(columnOrder: string[]) {
		try {
			const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
			if (currentBoard) {
				this.boardManager.updateBoard(currentBoard.id, { columnOrder });
				await this.saveSettings();
			}
		} catch (error) {
			console.error('Failed to update column order:', error);
			showError('Failed to update column order');
		}
	}

	// Helper method to get files with the current board's tag
	async getKanbanFiles() {
		try {
			const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
			if (!currentBoard) return [];

			const files = this.app.vault.getMarkdownFiles();
			const kanbanFiles = [];

			for (const file of files) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache) {
					const tags = getAllTags(cache);
					if (tags.includes(currentBoard.tagFilter)) {
						kanbanFiles.push(file);
					}
				}
			}

			return kanbanFiles;
		} catch (error) {
			console.error('Failed to get kanban files:', error);
			return [];
		}
	}
}