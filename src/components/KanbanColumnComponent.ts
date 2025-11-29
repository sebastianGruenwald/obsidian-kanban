import { App, Menu, setIcon } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import { KanbanCardComponent } from './KanbanCardComponent';
import { RenameColumnModal, getRandomCardColor } from '../modals';
import KanbanPlugin from '../main';
import { DataManager } from '../dataManager';

export class KanbanColumnComponent {
	private element: HTMLElement;
	private contentEl: HTMLElement | null = null;
	private isCreatingCard: boolean = false;

	constructor(
		private app: App,
		private plugin: KanbanPlugin,
		private dataManager: DataManager,
		private boardConfig: BoardConfig,
		private container: HTMLElement,
		private columnName: string,
		private cards: KanbanCard[],
		private allColumns: string[],
		private callbacks: {
			onCardMove: (filePath: string, newColumn: string) => void;
			onCardArchive: (card: KanbanCard) => void;
			onColumnRename: () => void;
			onColumnDelete: () => void;
			onColumnResize: (width: number) => void;
			onNewCard: () => void;
			onDragStart: (e: DragEvent, card: KanbanCard, element: HTMLElement) => void;
			onDragEnd: () => void;
			getDraggedCard: () => HTMLElement | null;
			getPlaceholder: () => HTMLElement | null;
			setPlaceholder: (el: HTMLElement | null) => void;
			onColumnReorder?: (draggedColumn: string, targetColumn: string) => void;
		}
	) {
		this.element = this.render();
	}

	private render(): HTMLElement {
		const column = this.container.createDiv({ cls: 'kanban-column' });
		column.setAttribute('data-column-name', this.columnName);
		
		this.renderHeader(column);
		
		// Column content
		this.contentEl = column.createDiv({ cls: 'kanban-column-content' });
		
		// Make column droppable
		this.makeDroppable(this.contentEl);
		
		// Add cards
		for (const card of this.cards) {
			new KanbanCardComponent(
				this.app,
				card,
				this.boardConfig,
				this.contentEl,
				this.allColumns,
				this.callbacks.onCardMove,
				this.callbacks.onDragStart,
				this.callbacks.onDragEnd,
				this.callbacks.onCardArchive,
				this.dataManager,
				this.callbacks.onNewCard,
				this.boardConfig.showCardColors ?? true
			);
		}

		return column;
	}

	private renderHeader(column: HTMLElement): void {
		const header = column.createDiv({ cls: 'kanban-column-header' });
		
		// Make header draggable for column reordering
		header.draggable = true;
		header.setAttribute('data-column-name', this.columnName);
		
		// Column drag events
		header.addEventListener('dragstart', (e) => {
			e.dataTransfer?.setData('text/column', this.columnName);
			column.addClass('column-dragging');
		});
		
		header.addEventListener('dragend', () => {
			column.removeClass('column-dragging');
			// Remove drag-over from all columns
			this.container.querySelectorAll('.kanban-column').forEach(col => {
				col.removeClass('column-drag-over');
			});
		});
		
		// Column drop zone (the whole column is a drop target)
		column.addEventListener('dragover', (e) => {
			const columnData = e.dataTransfer?.types.includes('text/column');
			if (columnData) {
				e.preventDefault();
				column.addClass('column-drag-over');
			}
		});
		
		column.addEventListener('dragleave', (e) => {
			if (!column.contains(e.relatedTarget as Node)) {
				column.removeClass('column-drag-over');
			}
		});
		
		column.addEventListener('drop', (e) => {
			const draggedColumn = e.dataTransfer?.getData('text/column');
			if (draggedColumn && draggedColumn !== this.columnName) {
				e.preventDefault();
				column.removeClass('column-drag-over');
				if (this.callbacks.onColumnReorder) {
					this.callbacks.onColumnReorder(draggedColumn, this.columnName);
				}
			}
		});
		
		const titleContainer = header.createDiv({ cls: 'kanban-column-title-container' });
		titleContainer.createSpan({ text: this.columnName, cls: 'kanban-column-title' });
		
		const headerControls = header.createDiv({ cls: 'kanban-column-controls' });
		
		// Add card button
		const addBtn = headerControls.createEl('button', { 
			cls: 'kanban-add-card-btn',
			attr: { title: 'Add new card' }
		});
		setIcon(addBtn, 'plus');
		
		addBtn.addEventListener('click', () => {
			this.startInlineCardCreation();
		});

		// Column options button
		const optionsBtn = headerControls.createEl('button', { 
			cls: 'kanban-column-options-btn',
			attr: { title: 'Column options' }
		});
		setIcon(optionsBtn, 'more-horizontal');
		
		optionsBtn.addEventListener('click', (e) => {
			this.showColumnMenu(e);
		});
		
		if (this.plugin.settings.showFileCount) {
			header.createSpan({ 
				cls: 'kanban-column-count',
				text: ` (${this.cards.length})`
			});
		}
	}

	private showColumnMenu(event: MouseEvent): void {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle('Delete Column')
				.setIcon('trash')
				.onClick(() => this.callbacks.onColumnDelete());
		});
		
		menu.addItem((item) => {
			item.setTitle('Rename Column')
				.setIcon('pencil')
				.onClick(() => {
					new RenameColumnModal(this.app, this.plugin, this.boardConfig.id, this.columnName, () => {
						this.callbacks.onColumnRename();
					}).open();
				});
		});
		
		menu.showAtMouseEvent(event);
	}

	private makeDroppable(element: HTMLElement): void {
		let isScheduled = false;
		let lastY = 0;

		element.addEventListener('dragover', (e) => {
			e.preventDefault();
			element.addClass('drag-over');
			lastY = e.clientY;
			
			if (!isScheduled) {
				isScheduled = true;
				requestAnimationFrame(() => {
					const draggedCard = this.callbacks.getDraggedCard();
					const placeholder = this.callbacks.getPlaceholder();

					if (placeholder && draggedCard) {
						const afterElement = this.getDragAfterElement(element, lastY);
						
						if (afterElement == null) {
							if (placeholder.parentNode !== element || placeholder.nextSibling) {
								element.appendChild(placeholder);
							}
						} else {
							if (placeholder.nextSibling !== afterElement) {
								element.insertBefore(placeholder, afterElement);
							}
						}
					}
					isScheduled = false;
				});
			}
		});
		
		element.addEventListener('dragleave', (e) => {
			if (!element.contains(e.relatedTarget as Node)) {
				element.removeClass('drag-over');
				const placeholder = this.callbacks.getPlaceholder();
				if (placeholder && placeholder.parentNode === element) {
					placeholder.remove();
				}
			}
		});
		
		element.addEventListener('drop', async (e) => {
			e.preventDefault();
			element.removeClass('drag-over');
			
			const filePath = e.dataTransfer?.getData('text/plain');
			const draggedCard = this.callbacks.getDraggedCard();
			const placeholder = this.callbacks.getPlaceholder();

			if (filePath && draggedCard) {
				if (placeholder && placeholder.parentNode === element) {
					element.insertBefore(draggedCard, placeholder);
					placeholder.remove();
				} else {
					element.appendChild(draggedCard);
				}
				
				draggedCard.removeClass('dragging');
				
				this.callbacks.onCardMove(filePath, this.columnName);
			}
		});
	}

	private getDragAfterElement(container: HTMLElement, y: number): Element | null {
		// Optimization: Use children iteration instead of querySelectorAll + reduce
		// This avoids array allocation and stops as soon as the target is found
		const children = container.children;
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.classList.contains('kanban-card') && !child.classList.contains('dragging')) {
				const box = child.getBoundingClientRect();
				const centerY = box.top + box.height / 2;
				if (y < centerY) {
					return child;
				}
			}
		}
		return null;
	}

	private startInlineCardCreation(): void {
		if (this.isCreatingCard || !this.contentEl) return;
		this.isCreatingCard = true;

		// Pre-select a random color for this card (only if colors are enabled)
		const showColors = this.boardConfig.showCardColors ?? true;
		const cardColor = getRandomCardColor();

		// Create a new card element with an input - insert at TOP
		const newCardEl = document.createElement('div');
		newCardEl.className = 'kanban-card kanban-card-new';
		
		// Apply the random color immediately so it shows while typing (only if colors enabled)
		if (showColors) {
			newCardEl.setAttribute('data-card-color', cardColor);
		}
		
		// Insert at the beginning of the content
		if (this.contentEl.firstChild) {
			this.contentEl.insertBefore(newCardEl, this.contentEl.firstChild);
		} else {
			this.contentEl.appendChild(newCardEl);
		}
		
		// Apply density class
		if (this.boardConfig.cardDensity) {
			newCardEl.addClass(`density-${this.boardConfig.cardDensity}`);
		} else {
			newCardEl.addClass('density-comfortable');
		}

		// Create input field
		const inputEl = newCardEl.createEl('input', {
			cls: 'kanban-card-title-input',
			attr: {
				type: 'text',
				placeholder: 'Card title...'
			}
		});

		// Focus the input
		setTimeout(() => inputEl.focus(), 0);

		// Handle Enter key
		inputEl.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				const title = inputEl.value.trim();
				if (title) {
					await this.createCard(title, newCardEl);
				} else {
					this.cancelInlineCardCreation(newCardEl);
				}
			} else if (e.key === 'Escape') {
				this.cancelInlineCardCreation(newCardEl);
			}
		});

		// Handle blur (clicking away)
		inputEl.addEventListener('blur', async () => {
			// Small delay to allow Enter key to be processed first
			setTimeout(async () => {
				if (this.isCreatingCard && newCardEl.parentNode) {
					const title = inputEl.value.trim();
					if (title) {
						await this.createCard(title, newCardEl);
					} else {
						this.cancelInlineCardCreation(newCardEl);
					}
				}
			}, 100);
		});

		// Scroll to the new card
		newCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}

	private async createCard(title: string, cardEl: HTMLElement): Promise<void> {
		try {
			const cardColor = cardEl.getAttribute('data-card-color') || undefined;
			await this.dataManager.createNewCard(this.columnName, title, cardColor);
			this.isCreatingCard = false;
			cardEl.remove();
			this.callbacks.onNewCard();
		} catch (error) {
			console.error('Error creating card:', error);
			this.isCreatingCard = false;
			cardEl.remove();
		}
	}

	private cancelInlineCardCreation(cardEl: HTMLElement): void {
		this.isCreatingCard = false;
		cardEl.remove();
	}
}
