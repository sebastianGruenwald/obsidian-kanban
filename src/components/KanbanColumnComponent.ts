import { App, Menu, setIcon } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import { KanbanCardComponent } from './KanbanCardComponent';
import { CreateCardModal, RenameColumnModal } from '../modals';
import KanbanPlugin from '../main';
import { DataManager } from '../dataManager';

export class KanbanColumnComponent {
	private element: HTMLElement;

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
		
		// Apply custom width if set
		if (this.boardConfig.columnWidths && this.boardConfig.columnWidths[this.columnName]) {
			column.style.flex = `0 1 ${this.boardConfig.columnWidths[this.columnName]}px`;
		}
		
		this.renderHeader(column);
		
		// Resize handle
		const resizeHandle = column.createDiv({ cls: 'kanban-column-resize-handle' });
		resizeHandle.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.startResizing(e, column);
		});
		
		// Column content
		const content = column.createDiv({ cls: 'kanban-column-content' });
		
		// Make column droppable
		this.makeDroppable(content);
		
		// Add cards
		for (const card of this.cards) {
			new KanbanCardComponent(
				this.app,
				card,
				this.boardConfig,
				content,
				this.allColumns,
				this.callbacks.onCardMove,
				this.callbacks.onDragStart,
				this.callbacks.onDragEnd,
				this.callbacks.onCardArchive
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
			new CreateCardModal(this.app, this.dataManager, this.columnName, () => {
				this.callbacks.onNewCard();
			}).open();
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

	private startResizing(e: MouseEvent, columnEl: HTMLElement): void {
		const startX = e.clientX;
		const startWidth = columnEl.offsetWidth;
		let animationFrameId: number;

		const onMouseMove = (e: MouseEvent) => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);

			animationFrameId = requestAnimationFrame(() => {
				const diff = e.clientX - startX;
				const newWidth = Math.max(200, startWidth + diff);
				
				columnEl.style.flex = `0 0 ${newWidth}px`;
				columnEl.style.width = `${newWidth}px`;
			});
		};

		const onMouseUp = () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);

			const style = window.getComputedStyle(columnEl);
			const flexBasis = style.flexBasis;
			const finalWidth = flexBasis !== 'auto' ? parseInt(flexBasis) : columnEl.offsetWidth;
			
			this.callbacks.onColumnResize(finalWidth);
			
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};

		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
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
}
