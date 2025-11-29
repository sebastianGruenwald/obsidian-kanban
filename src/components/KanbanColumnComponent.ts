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
				this.callbacks.onNewCard
			);
		}

		return column;
	}

	private renderHeader(column: HTMLElement): void {
		const header = column.createDiv({ cls: 'kanban-column-header' });
		
		// Make header draggable for column reordering (handled by parent view for now to simplify)
		header.draggable = true;
		header.setAttribute('data-column-name', this.columnName);
		
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
		element.addEventListener('dragover', (e) => {
			e.preventDefault();
			element.addClass('drag-over');
			
			const draggedCard = this.callbacks.getDraggedCard();
			const placeholder = this.callbacks.getPlaceholder();

			if (placeholder && draggedCard) {
				const afterElement = this.getDragAfterElement(element, e.clientY);
				
				if (afterElement == null) {
					element.appendChild(placeholder);
				} else {
					element.insertBefore(placeholder, afterElement);
				}
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

	private startInlineCardCreation(): void {
		if (this.isCreatingCard || !this.contentEl) return;
		this.isCreatingCard = true;

		// Pre-select a random color for this card
		const cardColor = getRandomCardColor();

		// Create a new card element with an input - insert at TOP
		const newCardEl = document.createElement('div');
		newCardEl.className = 'kanban-card kanban-card-new';
		
		// Apply the random color immediately so it shows while typing
		newCardEl.setAttribute('data-card-color', cardColor);
		
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
