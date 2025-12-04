import { App, Menu, setIcon } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import { KanbanCardComponent } from './KanbanCardComponent';
import { RenameColumnModal, getRandomCardColor } from '../modals';
import KanbanPlugin from '../main';
import { DataManager } from '../dataManager';
import Sortable from 'sortablejs';

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
			// Legacy callbacks kept for interface compatibility but unused
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
		this.contentEl.setAttribute('data-column-name', this.columnName);

		// Initialize Sortable for Cards
		new Sortable(this.contentEl, {
			group: 'kanban-cards',
			animation: 150,
			ghostClass: 'kanban-card-placeholder',
			delay: 200, // Delay for touch devices to prevent accidental drags
			delayOnTouchOnly: true,
			onAdd: (evt) => {
				const itemEl = evt.item;
				const filePath = itemEl.getAttribute('data-file-path');
				if (filePath) {
					this.callbacks.onCardMove(filePath, this.columnName);
				}
			}
		});

		// Add cards
		// Add cards with batch rendering to avoid freezing UI
		this.renderCardsBatched();

		return column;
	}

	private renderCardsBatched(): void {
		const BATCH_SIZE = 20;
		let currentIndex = 0;

		const renderBatch = () => {
			if (!this.contentEl) return;

			const end = Math.min(currentIndex + BATCH_SIZE, this.cards.length);

			for (let i = currentIndex; i < end; i++) {
				const card = this.cards[i];
				new KanbanCardComponent(
					this.app,
					card,
					this.boardConfig,
					this.contentEl,
					this.allColumns,
					this.callbacks.onCardMove,
					// Pass empty functions for legacy drag handlers
					() => { },
					() => { },
					this.callbacks.onCardArchive,
					this.dataManager,
					this.callbacks.onNewCard,
					this.boardConfig.showCardColors ?? true
				);
			}

			currentIndex = end;

			if (currentIndex < this.cards.length) {
				// Schedule next batch
				requestAnimationFrame(renderBatch);
			}
		};

		// Start rendering
		renderBatch();
	}

	private renderHeader(column: HTMLElement): void {
		const header = column.createDiv({ cls: 'kanban-column-header' });

		// Accessibility: Add ARIA attributes
		header.setAttribute('role', 'heading');
		header.setAttribute('aria-level', '2');

		// SortableJS handles the dragging now, but we need the class for the handle
		header.setAttribute('data-column-name', this.columnName);

		const titleContainer = header.createDiv({ cls: 'kanban-column-title-container' });
		titleContainer.createSpan({ text: this.columnName, cls: 'kanban-column-title' });

		const headerControls = header.createDiv({ cls: 'kanban-column-controls' });

		// Add card button
		const addBtn = headerControls.createEl('button', {
			cls: 'kanban-add-card-btn',
			attr: { 
				title: 'Add new card',
				'aria-label': `Add new card to ${this.columnName}`,
			}
		});
		setIcon(addBtn, 'plus');

		addBtn.addEventListener('click', () => {
			this.startInlineCardCreation();
		});

		// Column options button
		const optionsBtn = headerControls.createEl('button', {
			cls: 'kanban-column-options-btn',
			attr: { 
				title: 'Column options',
				'aria-label': `Options for ${this.columnName} column`,
			}
		});
		setIcon(optionsBtn, 'more-horizontal');

		optionsBtn.addEventListener('click', (e) => {
			this.showColumnMenu(e);
		});

		if (this.plugin.settings.showFileCount) {
			const limit = this.boardConfig.wipLimits?.[this.columnName];
			const countText = limit ? ` (${this.cards.length}/${limit})` : ` (${this.cards.length})`;

			const countSpan = header.createSpan({
				cls: 'kanban-column-count',
				text: countText,
				attr: {
					'aria-label': `${this.cards.length} cards${limit ? ` (limit: ${limit})` : ''}`,
				},
			});

			if (limit && this.cards.length > limit) {
				countSpan.addClass('wip-limit-exceeded');
				header.addClass('wip-limit-exceeded');
				// Add ARIA alert for screen readers
				countSpan.setAttribute('role', 'alert');
				countSpan.setAttribute('aria-live', 'polite');
			}
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

	// makeDroppable removed as SortableJS handles it



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
