import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon, TextComponent } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { AddColumnModal } from './modals';
import { VIEW_TYPE_KANBAN } from './constants';
import { KanbanColumnComponent } from './components/KanbanColumnComponent';

export { VIEW_TYPE_KANBAN };

export class KanbanView extends ItemView {
	private dataManager!: DataManager;
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;
	private placeholder: HTMLElement | null = null;
	private currentBoard: BoardConfig | null = null;
	private searchQuery: string = '';
	private headerContainer: HTMLElement | null = null;
	private boardContainer: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: KanbanPlugin) {
		super(leaf);
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
		
		this.cards = await this.dataManager.getKanbanCards();
		this.columns = this.dataManager.getColumns(this.cards);
		
		this.renderHeader();
		this.renderBoard();
	}

	private renderHeader(): void {
		if (!this.headerContainer) return;
		this.headerContainer.empty();
		if (!this.currentBoard) return;
		this.createBoardHeader(this.headerContainer);
	}

	private renderBoard(): void {
		if (!this.boardContainer) return;
		this.boardContainer.empty();
		
		if (!this.currentBoard) {
			this.boardContainer.createDiv({ 
				text: 'No board selected', 
				cls: 'kanban-error' 
			});
			return;
		}

		const kanbanContainer = this.boardContainer;
		
		// Column backgrounds setting
		if (this.currentBoard?.showColumnBackgrounds) {
			kanbanContainer.addClass('distinct-columns');
		} else {
			kanbanContainer.removeClass('distinct-columns');
		}

		if (this.currentBoard?.colorfulHeaders !== false) {
			kanbanContainer.addClass('colorful-headers');
		} else {
			kanbanContainer.removeClass('colorful-headers');
		}
		
		// Filter cards based on search query
		const filteredCards = this.searchQuery 
			? this.cards.filter(card => 
				card.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
				card.content.toLowerCase().includes(this.searchQuery.toLowerCase())
			)
			: this.cards;

		// Create columns
		for (const columnName of this.columns) {
			const columnCards = filteredCards.filter(card => card.column === columnName);
			
			new KanbanColumnComponent(
				this.app,
				this.plugin,
				this.dataManager,
				this.currentBoard,
				kanbanContainer,
				columnName,
				columnCards,
				this.columns,
				{
					onCardMove: (filePath, newColumn) => this.moveCard(filePath, newColumn),
					onCardArchive: (card) => this.archiveCard(card),
					onColumnRename: () => this.refresh(),
					onColumnDelete: async () => {
						await this.plugin.saveSettings();
						await this.refresh();
					},
					onColumnReorder: (draggedColumn, targetColumn) => {
						this.reorderColumns(draggedColumn, targetColumn);
					},
					onColumnResize: async (width) => {
						if (this.currentBoard) {
							const columnWidths = this.currentBoard.columnWidths || {};
							columnWidths[columnName] = width;
							this.plugin.boardManager.updateBoard(this.currentBoard.id, { columnWidths });
							await this.plugin.saveSettings();
						}
					},
					onNewCard: () => this.refresh(),
					onDragStart: (e, card, element) => {
						this.draggedCard = element;
						element.addClass('dragging');
						e.dataTransfer?.setData('text/plain', card.file);
						
						// Create placeholder
						this.placeholder = createDiv({ cls: 'kanban-card-placeholder' });
						this.placeholder.style.height = `${element.offsetHeight}px`;
					},
					onDragEnd: () => {
						if (this.draggedCard) {
							this.draggedCard.removeClass('dragging');
							this.draggedCard = null;
						}
						if (this.placeholder) {
							this.placeholder.remove();
							this.placeholder = null;
						}
					},
					getDraggedCard: () => this.draggedCard,
					getPlaceholder: () => this.placeholder,
					setPlaceholder: (el) => this.placeholder = el
				}
			);
		}
	}

	private createBoardHeader(container: HTMLElement): void {
		container.createEl('h2', { 
			text: this.currentBoard?.name || 'Kanban Board',
			cls: 'kanban-board-title'
		});

		const controls = container.createDiv({ cls: 'kanban-board-controls' });
		
		// Search input
		const searchContainer = controls.createDiv({ cls: 'kanban-search-container' });
		const searchInput = new TextComponent(searchContainer);
		searchInput.setPlaceholder('Search cards...');
		searchInput.setValue(this.searchQuery);
		searchInput.onChange((value) => {
			this.searchQuery = value;
			this.renderBoard(); // Re-render to filter cards
		});

		// Board selector
		const boardSelect = controls.createEl('select', { cls: 'kanban-board-selector' });
		const boards = this.plugin.boardManager.getAllBoards();
		boards.forEach(board => {
			const option = boardSelect.createEl('option', { 
				value: board.id, 
				text: board.name 
			});
			if (board.id === this.plugin.settings.activeBoard) {
				option.selected = true;
			}
		});

		boardSelect.addEventListener('change', async (e) => {
			const target = e.target as HTMLSelectElement;
			this.plugin.settings.activeBoard = target.value;
			await this.plugin.saveSettings();
			await this.refresh();
		});

		// Sort dropdown
		const sortContainer = controls.createDiv({ cls: 'kanban-sort-container' });
		sortContainer.createEl('label', { text: 'Sort:', cls: 'kanban-sort-label' });
		
		const sortSelect = sortContainer.createEl('select', { cls: 'kanban-sort-selector' });
		
		// Standard sort options
		const sortOptions = [
			{ value: 'none', text: 'No sorting' },
			{ value: 'creation', text: 'Created' },
			{ value: 'modification', text: 'Modified' },
			{ value: 'title', text: 'Title' }
		];

		// Add visible properties to sort options
		if (this.currentBoard?.visibleProperties) {
			this.currentBoard.visibleProperties.forEach(prop => {
				// Skip standard properties that are already covered or not sortable in a simple way
				if (!['title', 'created', 'modified', 'tags'].includes(prop)) {
					sortOptions.push({ value: prop, text: prop });
				}
			});
		}
		
		sortOptions.forEach(option => {
			const optionEl = sortSelect.createEl('option', { 
				value: option.value, 
				text: option.text 
			});
			if (option.value === this.currentBoard?.sortBy) {
				optionEl.selected = true;
			}
		});

		const orderSelect = sortContainer.createEl('select', { cls: 'kanban-sort-order-selector' });
		orderSelect.createEl('option', { value: 'asc', text: '↑' });
		orderSelect.createEl('option', { value: 'desc', text: '↓' });
		orderSelect.value = this.currentBoard?.sortOrder || 'asc';

		sortSelect.addEventListener('change', async (e) => {
			const target = e.target as HTMLSelectElement;
			this.plugin.boardManager.updateBoard(this.currentBoard!.id, { sortBy: target.value as any });
			await this.plugin.saveSettings();
			await this.refresh();
		});

		orderSelect.addEventListener('change', async (e) => {
			const target = e.target as HTMLSelectElement;
			this.plugin.boardManager.updateBoard(this.currentBoard!.id, { sortOrder: target.value as any });
			await this.plugin.saveSettings();
			await this.refresh();
		});

		// Add column button
		const addColumnBtn = controls.createEl('button', { 
			cls: 'kanban-add-column-btn',
			attr: { title: 'Add new column' }
		});
		setIcon(addColumnBtn, 'plus');
		addColumnBtn.createSpan({ text: ' Column' });
		
		addColumnBtn.addEventListener('click', () => {
			new AddColumnModal(this.app, this.plugin, this.currentBoard!.id, () => {
				this.refresh();
			}).open();
		});

		// Refresh button
		const refreshBtn = controls.createEl('button', { 
			cls: 'kanban-refresh-btn',
			attr: { title: 'Refresh Board' }
		});
		setIcon(refreshBtn, 'refresh-cw');
		
		refreshBtn.addEventListener('click', () => this.refresh());
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
