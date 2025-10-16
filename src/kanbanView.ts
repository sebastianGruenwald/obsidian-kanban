import { ItemView, WorkspaceLeaf, Menu, TFile, Modal, TextComponent, Setting, App } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';

export const VIEW_TYPE_KANBAN = 'kanban-board-view';

export class KanbanView extends ItemView {
	private dataManager: DataManager;
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;
	private currentBoard: BoardConfig | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: KanbanPlugin) {
		super(leaf);
		this.updateCurrentBoard();
	}

	private updateCurrentBoard() {
		this.currentBoard = this.plugin.boardManager.getBoard(this.plugin.settings.activeBoard);
		if (this.currentBoard) {
			this.dataManager = new DataManager(this.app, this.currentBoard);
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
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.updateCurrentBoard();
		if (!this.currentBoard || !this.dataManager) return;
		
		this.cards = await this.dataManager.getKanbanCards();
		this.columns = this.dataManager.getColumns(this.cards);
		this.render();
	}

	private render(): void {
		const container = this.containerEl.children[1];
		container.empty();
		
		if (!this.currentBoard) {
			container.createDiv({ 
				text: 'No board selected', 
				cls: 'kanban-error' 
			});
			return;
		}

		// Board header with controls
		const header = container.createDiv({ cls: 'kanban-header' });
		this.createBoardHeader(header);
		
		const kanbanContainer = container.createDiv({ cls: 'kanban-board' });
		
		// Create columns
		for (const columnName of this.columns) {
			const columnCards = this.cards.filter(card => card.column === columnName);
			this.createColumn(kanbanContainer, columnName, columnCards);
		}
		
		this.addStyles();
	}

	private createBoardHeader(container: HTMLElement): void {
		const title = container.createEl('h2', { 
			text: this.currentBoard?.name || 'Kanban Board',
			cls: 'kanban-board-title'
		});

		const controls = container.createDiv({ cls: 'kanban-board-controls' });
		
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
		const sortOptions = [
			{ value: 'none', text: 'No sorting' },
			{ value: 'creation', text: 'Created' },
			{ value: 'modification', text: 'Modified' },
			{ value: 'title', text: 'Title' }
		];
		
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
			text: '+ Column', 
			cls: 'kanban-add-column-btn',
			attr: { title: 'Add new column' }
		});
		addColumnBtn.addEventListener('click', () => {
			new AddColumnModal(this.app, this.plugin, this.currentBoard!.id, () => {
				this.refresh();
			}).open();
		});

		// Refresh button
		const refreshBtn = controls.createEl('button', { 
			text: '⟳', 
			cls: 'kanban-refresh-btn',
			attr: { title: 'Refresh Board' }
		});
		refreshBtn.addEventListener('click', () => this.refresh());
	}

	private createColumn(container: HTMLElement, columnName: string, cards: KanbanCard[]): void {
		const column = container.createDiv({ cls: 'kanban-column' });
		column.setAttribute('data-column-name', columnName);
		
		// Column header
		const header = column.createDiv({ cls: 'kanban-column-header' });
		
		// Make header draggable for column reordering
		header.draggable = true;
		header.addEventListener('dragstart', (e) => {
			e.dataTransfer?.setData('text/column-name', columnName);
			column.addClass('column-dragging');
			
			// Add visual indicators to all other columns
			const allColumns = container.querySelectorAll('.kanban-column');
			allColumns.forEach(col => {
				if (col !== column) {
					col.addClass('drop-target-available');
				}
			});
		});
		
		header.addEventListener('dragend', () => {
			column.removeClass('column-dragging');
			
			// Remove all visual indicators
			const allColumns = container.querySelectorAll('.kanban-column');
			allColumns.forEach(col => {
				col.removeClass('drop-target-available');
				col.querySelector('.kanban-column-header')?.removeClass('column-drag-over');
			});
		});
		
		// Make header a drop target for column reordering
		header.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer?.types.includes('text/column-name')) {
				header.addClass('column-drag-over');
			}
		});
		
		header.addEventListener('dragleave', (e) => {
			// Only remove if we're actually leaving the header area
			if (!header.contains(e.relatedTarget as Node)) {
				header.removeClass('column-drag-over');
			}
		});
		
		header.addEventListener('drop', async (e) => {
			e.preventDefault();
			header.removeClass('column-drag-over');
			
			const draggedColumnName = e.dataTransfer?.getData('text/column-name');
			if (draggedColumnName && draggedColumnName !== columnName) {
				await this.reorderColumns(draggedColumnName, columnName);
			}
		});
		
		const titleContainer = header.createDiv({ cls: 'kanban-column-title-container' });
		const title = titleContainer.createSpan({ text: columnName, cls: 'kanban-column-title' });
		const dragHandle = titleContainer.createSpan({ text: '⋮⋮', cls: 'kanban-column-drag-handle' });
		
		const headerControls = header.createDiv({ cls: 'kanban-column-controls' });
		
		// Add card button
		const addBtn = headerControls.createEl('button', { 
			text: '+', 
			cls: 'kanban-add-card-btn',
			attr: { title: 'Add new card' }
		});
		addBtn.addEventListener('click', () => {
			new CreateCardModal(this.app, this.dataManager, columnName, () => {
				this.refresh();
			}).open();
		});

		// Column options button
		const optionsBtn = headerControls.createEl('button', { 
			text: '⋯', 
			cls: 'kanban-column-options-btn',
			attr: { title: 'Column options' }
		});
		optionsBtn.addEventListener('click', (e) => {
			this.showColumnMenu(e, columnName);
		});
		
		if (this.plugin.settings.showFileCount) {
			const count = header.createSpan({ 
				cls: 'kanban-column-count',
				text: ` (${cards.length})`
			});
		}
		
		// Column content
		const content = column.createDiv({ cls: 'kanban-column-content' });
		
		// Make column droppable
		this.makeDroppable(content, columnName);
		
		// Add cards
		for (const card of cards) {
			this.createCard(content, card);
		}
	}

	private createCard(container: HTMLElement, card: KanbanCard): void {
		const cardEl = container.createDiv({ cls: 'kanban-card' });
		cardEl.setAttribute('data-file-path', card.file);
		
		// Make card draggable
		cardEl.draggable = true;
		cardEl.addEventListener('dragstart', (e) => {
			this.draggedCard = cardEl;
			cardEl.addClass('dragging');
			e.dataTransfer?.setData('text/plain', card.file);
		});
		
		cardEl.addEventListener('dragend', () => {
			cardEl.removeClass('dragging');
			this.draggedCard = null;
		});
		
		// Card content based on visible properties
		this.renderCardContent(cardEl, card);
		
		// Click to open file
		cardEl.addEventListener('click', () => {
			this.openFile(card.file);
		});
		
		// Right-click context menu
		cardEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showCardContextMenu(e, card);
		});
	}

	private renderCardContent(cardEl: HTMLElement, card: KanbanCard): void {
		if (!this.currentBoard) return;

		const visibleProperties = this.currentBoard.visibleProperties;
		
		// Always show title
		if (visibleProperties.includes('title')) {
			const title = cardEl.createDiv({ cls: 'kanban-card-title', text: card.title });
		}

		// Show other properties if configured
		const meta = cardEl.createDiv({ cls: 'kanban-card-meta' });
		
		if (visibleProperties.includes('created') && card.created) {
			meta.createSpan({ 
				cls: 'kanban-card-date',
				text: `Created: ${new Date(card.created).toLocaleDateString()}`
			});
		}

		if (visibleProperties.includes('modified') && card.modified) {
			meta.createSpan({ 
				cls: 'kanban-card-date',
				text: `Modified: ${new Date(card.modified).toLocaleDateString()}`
			});
		}

		if (visibleProperties.includes('tags') && card.frontmatter.tags) {
			const tags = Array.isArray(card.frontmatter.tags) ? card.frontmatter.tags : [card.frontmatter.tags];
			if (tags.length > 0) {
				const tagsEl = meta.createSpan({ cls: 'kanban-card-tags' });
				tagsEl.textContent = `Tags: ${tags.join(', ')}`;
			}
		}

		// Show custom frontmatter properties
		visibleProperties.forEach(prop => {
			if (!['title', 'created', 'modified', 'tags'].includes(prop) && card.frontmatter[prop]) {
				meta.createSpan({ 
					cls: 'kanban-card-property',
					text: `${prop}: ${card.frontmatter[prop]}`
				});
			}
		});
	}

	private showColumnMenu(event: MouseEvent, columnName: string): void {
		const menu = new Menu();
		
		// Allow deletion of both custom and default columns
		menu.addItem((item) => {
			item.setTitle('Delete Column')
				.setIcon('trash')
				.onClick(async () => {
					// Check if it's a default column or custom column
					if (this.currentBoard?.defaultColumns.includes(columnName)) {
						// Remove from default columns
						const newDefaultColumns = this.currentBoard.defaultColumns.filter(col => col !== columnName);
						this.plugin.boardManager.updateBoard(this.currentBoard.id, { defaultColumns: newDefaultColumns });
					} else if (this.currentBoard?.customColumns.includes(columnName)) {
						// Remove from custom columns
						this.plugin.boardManager.removeColumnFromBoard(this.currentBoard.id, columnName);
					}
					
					await this.plugin.saveSettings();
					await this.refresh();
				});
		});
		
		// Add rename option
		menu.addItem((item) => {
			item.setTitle('Rename Column')
				.setIcon('pencil')
				.onClick(() => {
					new RenameColumnModal(this.app, this.plugin, this.currentBoard!.id, columnName, () => {
						this.refresh();
					}).open();
				});
		});
		
		menu.showAtMouseEvent(event);
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

	private makeDroppable(element: HTMLElement, columnName: string): void {
		element.addEventListener('dragover', (e) => {
			e.preventDefault();
			element.addClass('drag-over');
		});
		
		element.addEventListener('dragleave', () => {
			element.removeClass('drag-over');
		});
		
		element.addEventListener('drop', async (e) => {
			e.preventDefault();
			element.removeClass('drag-over');
			
			const filePath = e.dataTransfer?.getData('text/plain');
			if (filePath && this.draggedCard) {
				await this.moveCard(filePath, columnName);
			}
		});
	}

	private async moveCard(filePath: string, newColumn: string): Promise<void> {
		try {
			await this.dataManager.updateCardColumn(filePath, newColumn);
			await this.refresh(); // Refresh to show the updated position
		} catch (error) {
			console.error('Failed to move card:', error);
		}
	}

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}

	private showCardContextMenu(event: MouseEvent, card: KanbanCard): void {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle('Open')
				.setIcon('file-text')
				.onClick(() => this.openFile(card.file));
		});
		
		menu.addItem((item) => {
			item.setTitle('Open in new tab')
				.setIcon('file-plus')
				.onClick(() => {
					const file = this.app.vault.getAbstractFileByPath(card.file);
					if (file instanceof TFile) {
						this.app.workspace.getLeaf('tab').openFile(file);
					}
				});
		});
		
		menu.addSeparator();
		
		// Add move options for each column
		for (const column of this.columns) {
			if (column !== card.column) {
				menu.addItem((item) => {
					item.setTitle(`Move to "${column}"`)
						.setIcon('arrow-right')
						.onClick(() => this.moveCard(card.file, column));
				});
			}
		}
		
		menu.showAtMouseEvent(event);
	}

	private addStyles(): void {
		// Add CSS styles if they don't exist
		if (!document.getElementById('kanban-board-styles')) {
			const style = document.createElement('style');
			style.id = 'kanban-board-styles';
			style.textContent = `
				.kanban-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 16px;
					border-bottom: 1px solid var(--background-modifier-border);
				}
				
				.kanban-board-title {
					margin: 0;
					color: var(--text-normal);
				}
				
				.kanban-board-controls {
					display: flex;
					gap: 8px;
					align-items: center;
				}
				
				.kanban-board-selector {
					padding: 4px 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-normal);
				}
				
				.kanban-refresh-btn {
					padding: 4px 8px;
					border: 1px solid var(--background-modifier-border);
					border-radius: 4px;
					background: var(--background-primary);
					color: var(--text-normal);
					cursor: pointer;
				}
				
				.kanban-refresh-btn:hover {
					background: var(--background-modifier-hover);
				}
				
				.kanban-board {
					display: flex;
					gap: 16px;
					padding: 16px;
					overflow-x: auto;
					height: calc(100% - 80px);
				}
				
				.kanban-column {
					min-width: 280px;
					background: var(--background-secondary);
					border-radius: 8px;
					flex-shrink: 0;
				}
				
				.kanban-column-header {
					padding: 12px 16px;
					border-bottom: 1px solid var(--background-modifier-border);
					font-weight: 600;
					display: flex;
					align-items: center;
					justify-content: space-between;
				}
				
				.kanban-column-controls {
					display: flex;
					gap: 4px;
				}
				
				.kanban-add-card-btn, .kanban-column-options-btn {
					background: none;
					border: none;
					color: var(--text-muted);
					cursor: pointer;
					padding: 2px 6px;
					border-radius: 3px;
					font-size: 14px;
				}
				
				.kanban-add-card-btn:hover, .kanban-column-options-btn:hover {
					background: var(--background-modifier-hover);
					color: var(--text-normal);
				}
				
				.kanban-column-count {
					color: var(--text-muted);
					font-size: 0.9em;
				}
				
				.kanban-column-content {
					padding: 8px;
					min-height: 200px;
				}
				
				.kanban-column-content.drag-over {
					background: var(--background-modifier-hover);
				}
				
				.kanban-card {
					background: var(--background-primary);
					border: 1px solid var(--background-modifier-border);
					border-radius: 6px;
					padding: 12px;
					margin-bottom: 8px;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				
				.kanban-card:hover {
					border-color: var(--interactive-accent);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
				}
				
				.kanban-card.dragging {
					opacity: 0.5;
					transform: rotate(5deg);
				}
				
				.kanban-card-title {
					font-weight: 500;
					margin-bottom: 8px;
					word-wrap: break-word;
				}
				
				.kanban-card-meta {
					font-size: 0.8em;
					color: var(--text-muted);
				}
				
				.kanban-card-date, .kanban-card-tags, .kanban-card-property {
					display: block;
					margin-bottom: 2px;
				}
				
				.kanban-error {
					padding: 20px;
					text-align: center;
					color: var(--text-muted);
				}
			`;
			document.head.appendChild(style);
		}
	}
}

class CreateCardModal extends Modal {
	private titleInput: TextComponent;

	constructor(app: App, private dataManager: DataManager, private columnName: string, private onSubmit: () => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Create New Card in "${this.columnName}"` });

		new Setting(contentEl)
			.setName('Card Title')
			.addText(text => {
				this.titleInput = text;
				text.setPlaceholder('Enter card title...');
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Create')
				.setCta()
				.onClick(async () => {
					const title = this.titleInput.getValue().trim();
					
					if (title) {
						await this.dataManager.createNewCard(this.columnName, title);
						this.close();
						this.onSubmit();
					}
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}
}

class AddColumnModal extends Modal {
	private columnInput: TextComponent;

	constructor(app: App, private plugin: KanbanPlugin, private boardId: string, private onSubmit: () => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Add Custom Column' });

		new Setting(contentEl)
			.setName('Column Name')
			.addText(text => {
				this.columnInput = text;
				text.setPlaceholder('New Column');
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Add')
				.setCta()
				.onClick(async () => {
					const columnName = this.columnInput.getValue().trim();
					
					if (columnName) {
						const success = this.plugin.boardManager.addColumnToBoard(this.boardId, columnName);
						if (success) {
							await this.plugin.saveSettings();
							this.plugin.refreshAllViews();
							this.close();
							this.onSubmit();
						}
					}
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}
}

class RenameColumnModal extends Modal {
	private columnInput: TextComponent;

	constructor(app: App, private plugin: KanbanPlugin, private boardId: string, private oldColumnName: string, private onSubmit: () => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Rename Column: ${this.oldColumnName}` });

		new Setting(contentEl)
			.setName('New Column Name')
			.addText(text => {
				this.columnInput = text;
				text.setPlaceholder(this.oldColumnName);
				text.setValue(this.oldColumnName);
				text.inputEl.select();
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Rename')
				.setCta()
				.onClick(async () => {
					const newColumnName = this.columnInput.getValue().trim();
					
					if (newColumnName && newColumnName !== this.oldColumnName) {
						const board = this.plugin.boardManager.getBoard(this.boardId);
						if (!board) return;

						// Handle renaming for default columns
						if (board.defaultColumns.includes(this.oldColumnName)) {
							const newDefaultColumns = board.defaultColumns.map(col => 
								col === this.oldColumnName ? newColumnName : col
							);
							this.plugin.boardManager.updateBoard(this.boardId, { defaultColumns: newDefaultColumns });
						}
						
						// Handle renaming for custom columns
						if (board.customColumns.includes(this.oldColumnName)) {
							this.plugin.boardManager.removeColumnFromBoard(this.boardId, this.oldColumnName);
							this.plugin.boardManager.addColumnToBoard(this.boardId, newColumnName);
						}

						// Update column order if it exists
						if (board.columnOrder.includes(this.oldColumnName)) {
							const newOrder = board.columnOrder.map(col => 
								col === this.oldColumnName ? newColumnName : col
							);
							this.plugin.boardManager.updateColumnOrder(this.boardId, newOrder);
						}

						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
						this.close();
						this.onSubmit();
					}
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}
}