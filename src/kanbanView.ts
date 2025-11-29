import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { CreateCardModal, AddColumnModal, RenameColumnModal } from './modals';
import { VIEW_TYPE_KANBAN } from './constants';

export { VIEW_TYPE_KANBAN };

export class KanbanView extends ItemView {
	private dataManager!: DataManager;
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;
	private placeholder: HTMLElement | null = null;
	private currentBoard: BoardConfig | null = null;
	private resizingColumn: { name: string, startX: number, startWidth: number } | null = null;

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
		
		if (this.currentBoard?.showColumnBackgrounds) {
			kanbanContainer.addClass('distinct-columns');
		}

		if (this.currentBoard?.colorfulHeaders !== false) {
			kanbanContainer.addClass('colorful-headers');
		}
		
		// Create columns
		for (const columnName of this.columns) {
			const columnCards = this.cards.filter(card => card.column === columnName);
			this.createColumn(kanbanContainer, columnName, columnCards);
		}
	}

	private createBoardHeader(container: HTMLElement): void {
		container.createEl('h2', { 
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

	private createColumn(container: HTMLElement, columnName: string, cards: KanbanCard[]): void {
		const column = container.createDiv({ cls: 'kanban-column' });
		column.setAttribute('data-column-name', columnName);
		
		// Apply custom width if set
		if (this.currentBoard?.columnWidths && this.currentBoard.columnWidths[columnName]) {
			// Set flex basis to custom width, allow shrinking but not growing beyond set width
			column.style.flex = `0 1 ${this.currentBoard.columnWidths[columnName]}px`;
		}
		
		// Column header
		const header = column.createDiv({ cls: 'kanban-column-header' });
		
		// Make header draggable for column reordering
		header.draggable = true;
		header.addEventListener('dragstart', (e) => {
			// Don't drag if resizing
			if (this.resizingColumn) {
				e.preventDefault();
				return;
			}
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
		titleContainer.createSpan({ text: columnName, cls: 'kanban-column-title' });
		
		// Removed drag handle icon as requested
		// const dragHandle = titleContainer.createSpan({ cls: 'kanban-column-drag-handle' });
		// setIcon(dragHandle, 'grip-vertical');
		
		const headerControls = header.createDiv({ cls: 'kanban-column-controls' });
		
		// Add card button
		const addBtn = headerControls.createEl('button', { 
			cls: 'kanban-add-card-btn',
			attr: { title: 'Add new card' }
		});
		setIcon(addBtn, 'plus');
		
		addBtn.addEventListener('click', () => {
			new CreateCardModal(this.app, this.dataManager, columnName, () => {
				this.refresh();
			}).open();
		});

		// Column options button
		const optionsBtn = headerControls.createEl('button', { 
			cls: 'kanban-column-options-btn',
			attr: { title: 'Column options' }
		});
		setIcon(optionsBtn, 'more-horizontal');
		
		optionsBtn.addEventListener('click', (e) => {
			this.showColumnMenu(e, columnName);
		});
		
		if (this.plugin.settings.showFileCount) {
			header.createSpan({ 
				cls: 'kanban-column-count',
				text: ` (${cards.length})`
			});
		}

		// Resize handle
		const resizeHandle = column.createDiv({ cls: 'kanban-column-resize-handle' });
		resizeHandle.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.startResizing(e, columnName, column);
		});
		
		// Column content
		const content = column.createDiv({ cls: 'kanban-column-content' });
		
		// Make column droppable
		this.makeDroppable(content, columnName);
		
		// Add cards
		for (const card of cards) {
			this.createCard(content, card);
		}
	}

	private startResizing(e: MouseEvent, columnName: string, columnEl: HTMLElement): void {
		this.resizingColumn = {
			name: columnName,
			startX: e.clientX,
			startWidth: columnEl.offsetWidth
		};

		let animationFrameId: number;

		const onMouseMove = (e: MouseEvent) => {
			if (!this.resizingColumn) return;
			
			// Cancel previous frame if it hasn't run yet
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}

			animationFrameId = requestAnimationFrame(() => {
				if (!this.resizingColumn) return;
				const diff = e.clientX - this.resizingColumn!.startX;
				const newWidth = Math.max(200, this.resizingColumn!.startWidth + diff); // Min width 200px
				
				// Update flex basis
				columnEl.style.flex = `0 0 ${newWidth}px`;
				columnEl.style.width = `${newWidth}px`; // Force width
			});
		};

		const onMouseUp = async () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}

			if (this.resizingColumn) {
				// Get width from flex-basis or offsetWidth
				const style = window.getComputedStyle(columnEl);
				const flexBasis = style.flexBasis;
				const finalWidth = flexBasis !== 'auto' ? parseInt(flexBasis) : columnEl.offsetWidth;
				
				// Save width
				if (this.currentBoard) {
					const columnWidths = this.currentBoard.columnWidths || {};
					columnWidths[this.resizingColumn.name] = finalWidth;
					this.plugin.boardManager.updateBoard(this.currentBoard.id, { columnWidths });
					await this.plugin.saveSettings();
				}
				
				this.resizingColumn = null;
			}
			
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}

	private createCard(container: HTMLElement, card: KanbanCard): void {
		const cardEl = container.createDiv({ cls: 'kanban-card' });
		
		// Apply density class
		if (this.currentBoard?.cardDensity) {
			cardEl.addClass(`density-${this.currentBoard.cardDensity}`);
		} else {
			cardEl.addClass('density-comfortable');
		}

		cardEl.setAttribute('data-file-path', card.file);
		
		// Make card draggable
		cardEl.draggable = true;
		cardEl.addEventListener('dragstart', (e) => {
			this.draggedCard = cardEl;
			cardEl.addClass('dragging');
			e.dataTransfer?.setData('text/plain', card.file);
			
			// Create placeholder
			this.placeholder = createDiv({ cls: 'kanban-card-placeholder' });
			this.placeholder.style.height = `${cardEl.offsetHeight}px`;
		});
		
		cardEl.addEventListener('dragend', () => {
			cardEl.removeClass('dragging');
			this.draggedCard = null;
			
			// Remove placeholder
			if (this.placeholder) {
				this.placeholder.remove();
				this.placeholder = null;
			}
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
			cardEl.createDiv({ cls: 'kanban-card-title', text: card.title });
		}

		// Container for tags and properties
		const body = cardEl.createDiv({ cls: 'kanban-card-body' });

		if (visibleProperties.includes('tags') && card.frontmatter.tags) {
			const tags = Array.isArray(card.frontmatter.tags) ? card.frontmatter.tags : [card.frontmatter.tags];
			if (tags.length > 0) {
				const tagsContainer = body.createDiv({ cls: 'kanban-card-tags-container' });
				tags.forEach((tag: string) => {
					const cleanTag = tag.replace('#', '');
					const tagEl = tagsContainer.createSpan({ cls: 'kanban-card-tag', text: cleanTag });
					
					// Apply tag color
					const color = this.getTagColor(cleanTag);
					if (color) {
						tagEl.style.backgroundColor = color;
						tagEl.style.color = '#ffffff'; // Assuming dark colors for now, or we could calculate contrast
						tagEl.style.borderColor = color;
					}
				});
			}
		}

		// Show custom frontmatter properties
		visibleProperties.forEach(prop => {
			if (!['title', 'created', 'modified', 'tags'].includes(prop) && card.frontmatter[prop]) {
				const propEl = body.createDiv({ cls: 'kanban-card-property' });
				propEl.createSpan({ cls: 'kanban-card-property-key', text: prop });
				propEl.createSpan({ cls: 'kanban-card-property-value', text: String(card.frontmatter[prop]) });
			}
		});

		// Footer for dates
		const footer = cardEl.createDiv({ cls: 'kanban-card-footer' });
		
		if (visibleProperties.includes('created') && card.created) {
			const dateEl = footer.createSpan({ cls: 'kanban-card-date' });
			dateEl.setAttribute('aria-label', 'Created');
			dateEl.setText(new Date(card.created).toLocaleDateString());
		}

		if (visibleProperties.includes('modified') && card.modified) {
			const dateEl = footer.createSpan({ cls: 'kanban-card-date' });
			dateEl.setAttribute('aria-label', 'Modified');
			dateEl.setText(new Date(card.modified).toLocaleDateString());
		}
	}

	private getTagColor(tag: string): string {
		if (!this.currentBoard) return '';
		
		// Check configured colors
		if (this.currentBoard.tagColors && this.currentBoard.tagColors[tag]) {
			return this.currentBoard.tagColors[tag];
		}
		
		// Generate deterministic color
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		// HSL color generation for nice pastel/vibrant colors
		const h = Math.abs(hash) % 360;
		return `hsl(${h}, 70%, 45%)`; // 45% lightness for good contrast with white text
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
			
			// Show placeholder logic
			if (this.placeholder && this.draggedCard) {
				const cards = Array.from(element.querySelectorAll('.kanban-card:not(.dragging)'));
				const afterElement = this.getDragAfterElement(element, e.clientY);
				
				if (afterElement == null) {
					element.appendChild(this.placeholder);
				} else {
					element.insertBefore(this.placeholder, afterElement);
				}
			}
		});
		
		element.addEventListener('dragleave', (e) => {
			// Only remove if we're actually leaving the column content area
			if (!element.contains(e.relatedTarget as Node)) {
				element.removeClass('drag-over');
				if (this.placeholder && this.placeholder.parentNode === element) {
					this.placeholder.remove();
				}
			}
		});
		
		element.addEventListener('drop', async (e) => {
			e.preventDefault();
			element.removeClass('drag-over');
			
			const filePath = e.dataTransfer?.getData('text/plain');
			if (filePath && this.draggedCard) {
				// Optimistic UI update
				if (this.placeholder && this.placeholder.parentNode === element) {
					element.insertBefore(this.draggedCard, this.placeholder);
					this.placeholder.remove();
				} else {
					element.appendChild(this.draggedCard);
				}
				
				// Remove dragging class immediately
				this.draggedCard.removeClass('dragging');
				
				// Update data in background
				await this.moveCard(filePath, columnName);
			}
		});
	}

	private getDragAfterElement(container: HTMLElement, y: number): Element | null {
		const draggableElements = Array.from(container.querySelectorAll('.kanban-card:not(.dragging)'));

		return draggableElements.reduce((closest: { offset: number, element: Element | null }, child) => {
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			
			if (offset < 0 && offset > closest.offset) {
				return { offset: offset, element: child };
			} else {
				return closest;
			}
		}, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
	}

	private async moveCard(filePath: string, newColumn: string): Promise<void> {
		try {
			await this.dataManager.updateCardColumn(filePath, newColumn);
			// Note: We don't call refresh() here anymore because the file watcher in main.ts
			// will trigger a refresh when the file is modified.
			// This prevents double-refreshing and makes the UI feel snappier.
		} catch (error) {
			console.error('Failed to move card:', error);
			// If it fails, we should probably refresh to restore state
			await this.refresh();
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
}
