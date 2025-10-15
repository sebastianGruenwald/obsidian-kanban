import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { KanbanSettings, DEFAULT_SETTINGS } from './types';
import { KanbanSettingTab } from './settings';
import { KanbanView, VIEW_TYPE_KANBAN } from './kanbanView';

export default class KanbanPlugin extends Plugin {
	settings: KanbanSettings;
	private views: KanbanView[] = [];

	async onload() {
		await this.loadSettings();

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

		// Add command
		this.addCommand({
			id: 'open-kanban-board',
			name: 'Open Kanban Board',
			callback: () => {
				this.activateView();
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
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

	// Helper method to update column order in settings
	async updateColumnOrder(columnOrder: string[]) {
		this.settings.columnOrder = columnOrder;
		await this.saveSettings();
	}

	// Helper method to get files with the kanban tag
	async getKanbanFiles() {
		const files = this.app.vault.getMarkdownFiles();
		const kanbanFiles = [];

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache) {
				const tags = this.getAllTags(cache);
				if (tags.includes(this.settings.tagFilter)) {
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