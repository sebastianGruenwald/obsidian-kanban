import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon, TextComponent } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { AddColumnModal } from './modals';
import { VIEW_TYPE_KANBAN } from './constants';
import { KanbanHeader } from './components/KanbanHeader';
import { KanbanBoardRenderer } from './components/KanbanBoardRenderer';
import { DragDropManager } from './utils/DragDropManager';

export { VIEW_TYPE_KANBAN };

export class KanbanView extends ItemView {
	private dataManager!: DataManager;
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;
	private placeholder: HTMLElement | null = null;
	private currentBoard: BoardConfig | null = null;
	private searchQuery: string = '';
	private selectedTags: Set<string> = new Set();
	private tagSearchQuery: string = '';
	private headerContainer: HTMLElement | null = null;
	private boardContainer: HTMLElement | null = null;
	private headerComponent: KanbanHeader | null = null;
	private boardRenderer: KanbanBoardRenderer | null = null;
	private dragDropManager: DragDropManager;

	constructor(leaf: WorkspaceLeaf, private plugin: KanbanPlugin) {
		super(leaf);
		this.dragDropManager = new DragDropManager();
		this.updateCurrentBoard();
	}

	private updateCurrentBoard() {
		this.currentBoard = this.plugin.boardManager.getBoard(this.plugin.settings.activeBoard);
		if (this.currentBoard) {
			this.dataManager = new DataManager(this.app, this.currentBoard, this.plugin.settings);
		}
	}

	getViewType(): string {
		return VIEW_TYPE_KANBAN;
	}

	getDisplayText(): string {
		return this.currentBoard ? `Kanban: ${this.currentBoard.name}` : 'Kanban Board';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		this.headerContainer = container.createDiv({ cls: 'kanban-header' });
		this.boardContainer = container.createDiv({ cls: 'kanban-board' });

		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.updateCurrentBoard();
		if (!this.currentBoard || !this.dataManager) return;

		// Apply theme
		document.body.classList.remove('theme-default', 'theme-sticky-notes');
		if (this.currentBoard.theme) {
			document.body.classList.add(`theme-${this.currentBoard.theme}`);
		} else {
			// Default to modern theme if not set
			document.body.classList.add('theme-default');
		}

		this.cards = await this.dataManager.getKanbanCards();

		// Run automations
		await this.dataManager.runAutomations(this.cards);

		// Re-fetch cards if automations might have changed them
		if (this.currentBoard.autoMoveCompleted || this.currentBoard.autoArchiveDelay > 0) {
			this.cards = await this.dataManager.getKanbanCards();
		}

		this.columns = this.dataManager.getColumns(this.cards);

		this.renderHeader();
		this.renderBoard();
	}

	private renderHeader(): void {
		if (!this.headerContainer) return;
		if (!this.currentBoard) return;

		if (!this.headerComponent) {
			this.headerComponent = new KanbanHeader(
				this.app,
				this.plugin,
				this.headerContainer,
				this.currentBoard,
				this.plugin.settings,
				() => this.refresh(),
				(query) => {
					this.searchQuery = query;
					this.renderBoard();
				},
				(tags) => {
					this.selectedTags = tags;
					this.renderBoard();
				},
				() => this.selectedTags,
				() => this.getAllTags(),
				() => this.getAllProperties()
			);
		}

		this.headerComponent.render(this.searchQuery);
	}

	private renderBoard(): void {
		if (!this.boardContainer) return;
		if (!this.currentBoard) return;

		if (!this.boardRenderer) {
			this.boardRenderer = new KanbanBoardRenderer(
				this.app,
				this.plugin,
				this.dataManager,
				this.dragDropManager,
				this.boardContainer,
				() => this.refresh(),
				(filePath: string, newColumn: string) => this.moveCard(filePath, newColumn),
				(card: KanbanCard) => this.archiveCard(card),
				(filePath: string, newColumn: string, swimlaneProp: string, swimlaneValue: string) => this.moveCardToSwimlane(filePath, newColumn, swimlaneProp, swimlaneValue),
				async (newOrder: string[]) => {
					if (this.currentBoard) {
						this.plugin.boardManager.updateColumnOrder(this.currentBoard.id, newOrder);
						await this.plugin.saveSettings();
						this.columns = newOrder;
					}
				}
			);
		}

		this.boardRenderer.render(
			this.currentBoard,
			this.cards,
			this.columns,
			this.searchQuery,
			this.selectedTags
		);
	}

	private async moveCardToSwimlane(filePath: string, newColumn: string, swimlaneProp: string, swimlaneValue: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
					frontmatter[this.currentBoard!.columnProperty] = newColumn;
					// If value is 'Unassigned', we might want to remove the property or set it to null/empty
					// But for now let's set it to null if it was 'Unassigned' and the property existed, 
					// or just don't set it if we want to keep it clean. 
					// Actually, if we drag to 'Unassigned' row, we should probably remove the property or set to null.
					if (swimlaneValue === 'Unassigned') {
						delete frontmatter[swimlaneProp];
					} else {
						frontmatter[swimlaneProp] = swimlaneValue;
					}
				});
				// Refresh is handled by file watcher usually, but let's force it to be snappy
				await this.refresh();
			}
		} catch (error) {
			console.error('Failed to move card to swimlane:', error);
		}
	}



	private getAllTags(): string[] {
		const tags = new Set<string>();
		this.cards.forEach(card => {
			if (card.frontmatter.tags) {
				const cardTags = Array.isArray(card.frontmatter.tags)
					? card.frontmatter.tags
					: [card.frontmatter.tags];
				cardTags.forEach((t: string) => tags.add(t.replace('#', '')));
			}
		});
		return Array.from(tags).sort();
	}

	private getAllProperties(): string[] {
		const properties = new Set<string>();
		this.cards.forEach(card => {
			if (card.frontmatter) {
				Object.keys(card.frontmatter).forEach(key => {
					// Exclude internal properties
					if (!['position', 'tags', 'archived'].includes(key)) {
						properties.add(key);
					}
				});
			}
		});
		return Array.from(properties).sort();
	}

	private async reorderColumns(draggedColumn: string, targetColumn: string): Promise<void> {
		if (!this.currentBoard) return;

		const currentOrder = this.columns;
		const draggedIndex = currentOrder.indexOf(draggedColumn);
		const targetIndex = currentOrder.indexOf(targetColumn);

		if (draggedIndex === -1 || targetIndex === -1) return;

		// Create new order
		const newOrder = [...currentOrder];
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedColumn);

		// Update board configuration
		this.plugin.boardManager.updateColumnOrder(this.currentBoard.id, newOrder);
		await this.plugin.saveSettings();
		await this.refresh();
	}

	private async moveCard(filePath: string, newColumn: string): Promise<void> {
		try {
			await this.dataManager.updateCardColumn(filePath, newColumn);
			this.cards = await this.dataManager.getKanbanCards();

			// Run automations
			await this.dataManager.runAutomations(this.cards);

			// Re-fetch cards if automations might have changed them (e.g. archived)
			// Optimization: We could return modified cards from runAutomations to avoid re-fetch
			// For now, simple re-fetch ensures consistency
			if (this.currentBoard?.autoMoveCompleted || (this.currentBoard?.autoArchiveDelay ?? 0) > 0) {
				this.cards = await this.dataManager.getKanbanCards();
			}

			this.columns = this.dataManager.getColumns(this.cards);
		} catch (error) {
			console.error('Failed to move card:', error);
			await this.refresh();
		}
	}

	private async archiveCard(card: KanbanCard): Promise<void> {
		try {
			await this.dataManager.archiveCard(card.file);
			// Refresh to remove the card from view
			// Note: File watcher might trigger refresh too, but this ensures immediate feedback if watcher is slow
			// or if we want to be sure.
			// Actually, let's rely on watcher or manual refresh if needed, but for archive it's better to refresh immediately
			// to show it's gone.
			// But wait, if we rely on watcher, we might get double refresh.
			// Let's just wait for watcher.
		} catch (error) {
			console.error('Failed to archive card:', error);
		}
	}

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}
}
