import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { KanbanSettings, DEFAULT_SETTINGS, BoardConfig } from './types';
import { KanbanSettingTab } from './settings';
import { KanbanView, VIEW_TYPE_KANBAN } from './kanbanView';
import { BoardManager } from './boardManager';

export default class KanbanPlugin extends Plugin {
	settings: KanbanSettings;
	boardManager: BoardManager;
	private views: KanbanView[] = [];

	async onload() {
		await this.loadSettings();
		this.boardManager = new BoardManager(this.settings.boards);

		// Register the kanban view
		this.registerView(
			VIEW_TYPE_KANBAN,
			(leaf) => {
				const view = new KanbanView(leaf, this);
				this.views.push(view);
				return view;
			}
		);

		// Add ribbon icon
		this.addRibbonIcon('layout-dashboard', 'Open Kanban Board', () => {
			this.activateView();
		});

		// Add command to open kanban board
		this.addCommand({
			id: 'open-kanban-board',
			name: 'Open Kanban Board',
			callback: () => {
				this.activateView();
			}
		});

		// Add command to switch boards
		this.addCommand({
			id: 'switch-kanban-board',
			name: 'Switch Kanban Board',
			callback: () => {
				this.showBoardSwitcher();
			}
		});

		// Add command to refresh kanban board
		this.addCommand({
			id: 'refresh-kanban-board',
			name: 'Refresh Kanban Board',
			callback: () => {
				this.refreshAllViews();
			}
		});

		// Add command to create new board
		this.addCommand({
			id: 'create-kanban-board',
			name: 'Create New Kanban Board',
			callback: () => {
				this.createNewBoard();
			}
		});

		// Register settings tab
		this.addSettingTab(new KanbanSettingTab(this.app, this));

		// Auto-refresh on file changes
		if (this.settings.autoRefresh) {
			this.registerEvent(
				this.app.vault.on('modify', () => {
					this.refreshAllViews();
				})
			);

			this.registerEvent(
				this.app.vault.on('create', () => {
					this.refreshAllViews();
				})
			);

			this.registerEvent(
				this.app.vault.on('delete', () => {
					this.refreshAllViews();
				})
			);

			this.registerEvent(
				this.app.metadataCache.on('changed', () => {
					this.refreshAllViews();
				})
			);
		}

		console.log('Kanban Board plugin loaded');
	}

	onunload() {
		this.views = [];
		// Remove styles
		const styleEl = document.getElementById('kanban-board-styles');
		if (styleEl) {
			styleEl.remove();
		}
		console.log('Kanban Board plugin unloaded');
	}

	async loadSettings() {
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
	}

	async saveSettings() {
		// Update the board manager's boards with current settings
		this.settings.boards = this.boardManager.getAllBoards();
		await this.saveData(this.settings);
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
		for (const view of this.views) {
			view.refresh();
		}
	}

	private showBoardSwitcher() {
		const boards = this.boardManager.getAllBoards();
		
		// Create a simple suggester for board switching
		// This could be enhanced with a proper modal in the future
		const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
		new Notice(`Current board: ${currentBoard?.name || 'Unknown'}. Use settings to switch boards.`);
	}

	private async createNewBoard() {
		// This could be enhanced with a proper modal
		// For now, users can create boards through settings
		new Notice('Use the settings panel to create new boards.');
	}

	// Helper method to update column order in settings
	async updateColumnOrder(columnOrder: string[]) {
		const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
		if (currentBoard) {
			this.boardManager.updateBoard(currentBoard.id, { columnOrder });
			await this.saveSettings();
		}
	}

	// Helper method to get files with the current board's tag
	async getKanbanFiles() {
		const currentBoard = this.boardManager.getBoard(this.settings.activeBoard);
		if (!currentBoard) return [];

		const files = this.app.vault.getMarkdownFiles();
		const kanbanFiles = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache) {
				const tags = this.getAllTags(cache);
				if (tags.includes(currentBoard.tagFilter)) {
					kanbanFiles.push(file);
				}
			}
		}

		return kanbanFiles;
	}

	private getAllTags(cache: any): string[] {
		const tags: string[] = [];
		
		// Get tags from frontmatter
		if (cache.frontmatter?.tags) {
			const frontmatterTags = Array.isArray(cache.frontmatter.tags) 
				? cache.frontmatter.tags 
				: [cache.frontmatter.tags];
			tags.push(...frontmatterTags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`));
		}
		
		// Get tags from content
		if (cache.tags) {
			tags.push(...cache.tags.map((tagCache: any) => tagCache.tag));
		}
		
		return tags;
	}
}