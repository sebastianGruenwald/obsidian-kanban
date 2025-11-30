import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon, TextComponent } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { AddColumnModal } from './modals';
import { VIEW_TYPE_KANBAN } from './constants';
import { KanbanColumnComponent } from './components/KanbanColumnComponent';
import Sortable from 'sortablejs';

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
	private tagFilterPopup: HTMLElement | null = null;
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

		// Initialize Sortable for Columns (only if not using swimlanes, as swimlanes change structure)
		// For simplicity, we disable column reordering via drag-and-drop when swimlanes are active for now
		if (!this.currentBoard?.swimlaneProperty) {
			new Sortable(kanbanContainer, {
				animation: 150,
				handle: '.kanban-column-header',
				ghostClass: 'kanban-column-placeholder',
				onEnd: async (evt) => {
					if (evt.oldIndex === undefined || evt.newIndex === undefined || evt.oldIndex === evt.newIndex) return;

					const newOrder = [...this.columns];
					const movedColumn = newOrder.splice(evt.oldIndex, 1)[0];
					newOrder.splice(evt.newIndex, 0, movedColumn);

					// Update board configuration
					if (this.currentBoard) {
						this.plugin.boardManager.updateColumnOrder(this.currentBoard.id, newOrder);
						await this.plugin.saveSettings();
						this.columns = newOrder;
					}
				}
			});
		}

		// Filter cards based on search query and tags
		const filteredCards = this.cards.filter(card => {
			const matchesSearch = !this.searchQuery ||
				card.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
				card.content.toLowerCase().includes(this.searchQuery.toLowerCase());

			if (!matchesSearch) return false;

			if (this.selectedTags.size === 0) return true;

			const cardTags = card.frontmatter.tags
				? (Array.isArray(card.frontmatter.tags) ? card.frontmatter.tags : [card.frontmatter.tags])
				: [];

			// Check if card has ANY of the selected tags
			const cleanCardTags = cardTags.map((t: string) => t.replace('#', ''));
			return cleanCardTags.some((t: string) => this.selectedTags.has(t));
		});

		if (this.currentBoard?.swimlaneProperty) {
			this.renderSwimlanes(kanbanContainer, filteredCards);
		} else {
			this.renderColumns(kanbanContainer, filteredCards);
		}
	}

	private renderColumns(container: HTMLElement, cards: KanbanCard[]): void {
		for (const columnName of this.columns) {
			const columnCards = cards.filter(card => card.column === columnName);

			new KanbanColumnComponent(
				this.app,
				this.plugin,
				this.dataManager,
				this.currentBoard!,
				container,
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
					onColumnReorder: (draggedColumn, targetColumn) => { },
					onColumnResize: async (width) => {
						if (this.currentBoard) {
							const columnWidths = this.currentBoard.columnWidths || {};
							columnWidths[columnName] = width;
							this.plugin.boardManager.updateBoard(this.currentBoard.id, { columnWidths });
							await this.plugin.saveSettings();
						}
					},
					onNewCard: () => this.refresh(),
					onDragStart: () => { },
					onDragEnd: () => { },
					getDraggedCard: () => null,
					getPlaceholder: () => null,
					setPlaceholder: () => { }
				}
			);
		}
	}

	private renderSwimlanes(container: HTMLElement, cards: KanbanCard[]): void {
		container.addClass('has-swimlanes');
		const swimlaneProp = this.currentBoard!.swimlaneProperty!;

		// Get unique swimlane values
		const swimlaneValues = new Set<string>();
		cards.forEach(card => {
			const val = card.frontmatter[swimlaneProp] || 'Unassigned';
			swimlaneValues.add(String(val));
		});

		const sortedSwimlanes = Array.from(swimlaneValues).sort();

		// Render Column Headers Row
		const headerRow = container.createDiv({ cls: 'kanban-swimlane-header-row' });
		// Empty corner cell
		headerRow.createDiv({ cls: 'kanban-swimlane-corner' });

		this.columns.forEach(colName => {
			const colHeader = headerRow.createDiv({ cls: 'kanban-column-header' });
			colHeader.createSpan({ text: colName, cls: 'kanban-column-title' });
		});

		// Render Swimlane Rows
		for (const swimlane of sortedSwimlanes) {
			const row = container.createDiv({ cls: 'kanban-swimlane-row' });

			// Swimlane Header (Vertical)
			const swimlaneHeader = row.createDiv({ cls: 'kanban-swimlane-header' });
			swimlaneHeader.createSpan({ text: swimlane });

			// Columns within Swimlane
			for (const columnName of this.columns) {
				const cell = row.createDiv({ cls: 'kanban-swimlane-cell' });
				const cellCards = cards.filter(card =>
					card.column === columnName &&
					(String(card.frontmatter[swimlaneProp] || 'Unassigned') === swimlane)
				);

				// We reuse KanbanColumnComponent but we need to hide its header via CSS or modify it
				// For now, let's use a modified initialization or CSS class
				const colComponent = new KanbanColumnComponent(
					this.app,
					this.plugin,
					this.dataManager,
					this.currentBoard!,
					cell, // Render into cell
					columnName,
					cellCards,
					this.columns,
					{
						onCardMove: async (filePath, newColumn) => {
							// When moving to a cell, we also need to update the swimlane property!
							// But KanbanColumnComponent only knows about columns.
							// We need to intercept this.
							await this.moveCardToSwimlane(filePath, newColumn, swimlaneProp, swimlane);
						},
						onCardArchive: (card) => this.archiveCard(card),
						onColumnRename: () => this.refresh(),
						onColumnDelete: async () => {
							await this.plugin.saveSettings();
							await this.refresh();
						},
						onColumnReorder: () => { },
						onColumnResize: () => { },
						onNewCard: () => this.refresh(),
						onDragStart: () => { },
						onDragEnd: () => { },
						getDraggedCard: () => null,
						getPlaceholder: () => null,
						setPlaceholder: () => { }
					}
				);

				// Add a class to indicate this is a cell, so we can hide the header via CSS
				cell.querySelector('.kanban-column')?.addClass('is-swimlane-cell');
			}
		}
	}

	private async moveCardToSwimlane(filePath: string, newColumn: string, swimlaneProp: string, swimlaneValue: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
					frontmatter[this.currentBoard!.columnProperty] = newColumn;
					frontmatter[swimlaneProp] = swimlaneValue === 'Unassigned' ? null : swimlaneValue;
				});
				await this.refresh();
			}
		} catch (error) {
			console.error('Failed to move card to swimlane:', error);
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

		// Filter button
		const filterBtn = controls.createEl('button', {
			cls: `kanban-filter-btn ${this.selectedTags.size > 0 ? 'is-active' : ''}`,
			attr: { title: 'Filter Tags' }
		});
		setIcon(filterBtn, 'filter');
		if (this.selectedTags.size > 0) {
			filterBtn.createSpan({ text: `${this.selectedTags.size}`, cls: 'kanban-filter-count' });
		}

		filterBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleTagFilter(filterBtn);
		});
	}

	private toggleTagFilter(targetBtn: HTMLElement): void {
		if (this.tagFilterPopup) {
			this.closeTagFilter();
			return;
		}

		this.openTagFilter(targetBtn);
	}

	private closeTagFilter(): void {
		if (this.tagFilterPopup) {
			this.tagFilterPopup.remove();
			this.tagFilterPopup = null;
			document.removeEventListener('click', this.handleDocumentClick);
		}
	}

	private handleDocumentClick = (e: MouseEvent) => {
		if (this.tagFilterPopup && !this.tagFilterPopup.contains(e.target as Node)) {
			this.closeTagFilter();
		}
	};

	private openTagFilter(targetBtn: HTMLElement): void {
		const allTags = this.getAllTags();
		if (allTags.length === 0) return;

		this.tagFilterPopup = document.body.createDiv({ cls: 'kanban-tag-filter-popup' });

		// Position the popup
		const rect = targetBtn.getBoundingClientRect();
		this.tagFilterPopup.style.top = `${rect.bottom + 5}px`;
		this.tagFilterPopup.style.left = `${rect.right - 250}px`; // Align right edge roughly

		// Search input
		const searchContainer = this.tagFilterPopup.createDiv({ cls: 'kanban-tag-filter-search' });
		const searchInput = new TextComponent(searchContainer);
		searchInput.setPlaceholder('Search tags...');
		searchInput.setValue(this.tagSearchQuery);
		searchInput.onChange((value) => {
			this.tagSearchQuery = value;
			this.renderTagList(listContainer, allTags);
		});

		// Focus input
		setTimeout(() => searchInput.inputEl.focus(), 0);

		// Tag list
		const listContainer = this.tagFilterPopup.createDiv({ cls: 'kanban-tag-filter-list' });
		this.renderTagList(listContainer, allTags);

		// Close on outside click
		document.addEventListener('click', this.handleDocumentClick);

		// Prevent clicks inside popup from closing it
		this.tagFilterPopup.addEventListener('click', (e) => e.stopPropagation());
	}

	private renderTagList(container: HTMLElement, allTags: string[]): void {
		container.empty();

		const filteredTags = allTags.filter(tag =>
			tag.toLowerCase().includes(this.tagSearchQuery.toLowerCase())
		);

		if (filteredTags.length === 0) {
			container.createDiv({ cls: 'kanban-tag-filter-empty', text: 'No tags found' });
			return;
		}

		// "Select All" / "Clear All" helper if searching
		if (this.tagSearchQuery) {
			// Optional: Add helper buttons here if needed
		}

		filteredTags.forEach(tag => {
			const item = container.createDiv({ cls: 'kanban-tag-filter-item' });
			const checkbox = item.createEl('input', {
				type: 'checkbox',
				cls: 'kanban-tag-filter-checkbox'
			});
			checkbox.checked = this.selectedTags.has(tag);

			item.createSpan({ text: tag, cls: 'kanban-tag-filter-label' });

			item.addEventListener('click', () => {
				checkbox.checked = !checkbox.checked;
				if (checkbox.checked) {
					this.selectedTags.add(tag);
				} else {
					this.selectedTags.delete(tag);
				}
				this.renderHeader(); // Update button count
				this.renderBoard(); // Filter board
			});

			// Prevent double toggle when clicking checkbox directly
			checkbox.addEventListener('click', (e) => e.stopPropagation());
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedTags.add(tag);
				} else {
					this.selectedTags.delete(tag);
				}
				this.renderHeader();
				this.renderBoard();
			});
		});
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
