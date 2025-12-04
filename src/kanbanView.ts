import { ItemView, WorkspaceLeaf, Menu, TFile, setIcon, TextComponent } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { AddColumnModal } from './modals';
import { VIEW_TYPE_KANBAN } from './constants';
import { KanbanColumnComponent } from './components/KanbanColumnComponent';
import { errorHandler } from './errorHandler';
import { SearchFilterService } from './services/SearchFilterService';
import Sortable from 'sortablejs';

export { VIEW_TYPE_KANBAN };

export class KanbanView extends ItemView {
	private dataManager!: DataManager;
	private searchFilterService: SearchFilterService = new SearchFilterService();
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;
	private placeholder: HTMLElement | null = null;
	private currentBoard: BoardConfig | null = null;
	private searchQuery: string = '';
	private selectedTags: Set<string> = new Set();
	private tagSearchQuery: string = '';
	private tagFilterPopup: HTMLElement | null = null;
	private themePopup: HTMLElement | null = null;
	private propsPopup: HTMLElement | null = null;
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
				delay: 200, // Delay for touch devices
				delayOnTouchOnly: true,
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

		// Filter cards using SearchFilterService
		const filteredCards = this.searchFilterService.filterCards(this.cards, {
			searchQuery: this.searchQuery,
			selectedTags: this.selectedTags
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
					if (this.currentBoard) {
						this.plugin.boardManager.removeColumnFromBoard(this.currentBoard.id, columnName);
						await this.plugin.saveSettings();
						await this.refresh();
					}
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
		container.empty(); // Clear container first
		container.addClass('has-swimlanes');
		const swimlaneProp = this.currentBoard!.swimlaneProperty!;

		// Get unique swimlane values
		const swimlaneValues = new Set<string>();
		cards.forEach(card => {
			const val = card.frontmatter[swimlaneProp] || 'Unassigned';
			swimlaneValues.add(String(val));
		});

		// Sort swimlanes, keeping 'Unassigned' at the bottom or top? Let's keep it at bottom.
		const sortedSwimlanes = Array.from(swimlaneValues).sort((a, b) => {
			if (a === 'Unassigned') return 1;
			if (b === 'Unassigned') return -1;
			return a.localeCompare(b);
		});

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

				// Filter cards for this specific cell (column + swimlane value)
				const cellCards = cards.filter(card => {
					const cardSwimlaneVal = String(card.frontmatter[swimlaneProp] || 'Unassigned');
					return card.column === columnName && cardSwimlaneVal === swimlane;
				});

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
							if (this.currentBoard) {
								this.plugin.boardManager.removeColumnFromBoard(this.currentBoard.id, columnName);
								await this.plugin.saveSettings();
								await this.refresh();
							}
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
		await errorHandler.wrap(
			async () => {
				const file = this.app.vault.getAbstractFileByPath(filePath);
				if (file instanceof TFile) {
					await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
						frontmatter[this.currentBoard!.columnProperty] = newColumn;
						if (swimlaneValue === 'Unassigned') {
							delete frontmatter[swimlaneProp];
						} else {
							frontmatter[swimlaneProp] = swimlaneValue;
						}
					});
					await this.refresh();
				}
			},
			{ context: 'card-move', action: 'moveCardToSwimlane' }
		)();
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

		// Theme selector button
		const themeBtn = controls.createEl('button', {
			cls: 'kanban-theme-btn',
			attr: { title: 'Change Board Theme' }
		});
		setIcon(themeBtn, 'palette');

		themeBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (this.themePopup) {
				this.closeAllPopups();
			} else {
				this.closeAllPopups();
				this.showThemeSelector(themeBtn);
			}
		});

		// Properties toggle button
		const propsBtn = controls.createEl('button', {
			cls: 'kanban-props-btn',
			attr: { title: 'Toggle Visible Properties' }
		});
		setIcon(propsBtn, 'eye');

		propsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (this.propsPopup) {
				this.closeAllPopups();
			} else {
				this.closeAllPopups();
				this.showPropertiesToggle(propsBtn);
			}
		});
	}

	private closeAllPopups(): void {
		if (this.tagFilterPopup) {
			this.closeTagFilter();
		}
		if (this.themePopup) {
			this.themePopup.remove();
			this.themePopup = null;
		}
		if (this.propsPopup) {
			this.propsPopup.remove();
			this.propsPopup = null;
		}
	}

	private toggleTagFilter(targetBtn: HTMLElement): void {
		if (this.tagFilterPopup) {
			this.closeAllPopups();
			return;
		}

		this.closeAllPopups();
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

	private showThemeSelector(targetBtn: HTMLElement): void {
		this.themePopup = document.body.createDiv({ cls: 'kanban-theme-popup' });
		const popup = this.themePopup;

		// Position the popup
		const rect = targetBtn.getBoundingClientRect();
		popup.style.position = 'fixed';
		popup.style.top = `${rect.bottom + 5}px`;
		popup.style.right = `${window.innerWidth - rect.right}px`;

		popup.createEl('div', { text: 'Board Theme', cls: 'kanban-popup-title' });

		const themes = [
			{ value: 'default', label: 'Modern (Default)', icon: 'layout-grid' },
			{ value: 'sticky-notes', label: 'Sticky Notes', icon: 'sticky-note' }
		];

		themes.forEach(theme => {
			const item = popup.createDiv({ cls: 'kanban-popup-item' });
			const currentTheme = this.currentBoard?.theme || 'default';
			const isActive = currentTheme === theme.value;
			
			if (isActive) {
				item.addClass('is-active');
			}

			const iconEl = item.createSpan({ cls: 'kanban-popup-item-icon' });
			setIcon(iconEl, theme.icon);
			item.createSpan({ text: theme.label, cls: 'kanban-popup-item-label' });

			item.addEventListener('click', async () => {
				if (this.currentBoard) {
					// Update board config
					this.plugin.boardManager.updateBoard(this.currentBoard.id, { theme: theme.value as 'default' | 'sticky-notes' });
					await this.plugin.saveSettings();
					// Apply theme immediately
					document.body.classList.remove('theme-default', 'theme-sticky-notes');
					document.body.classList.add(`theme-${theme.value}`);
				}
				this.closeAllPopups();
			});
		});

		// Close on click outside
		const closePopup = (e: MouseEvent) => {
			if (!popup.contains(e.target as Node) && e.target !== targetBtn) {
				this.closeAllPopups();
				document.removeEventListener('click', closePopup);
			}
		};
		setTimeout(() => document.addEventListener('click', closePopup), 0);
	}

	private showPropertiesToggle(targetBtn: HTMLElement): void {
		if (!this.currentBoard) return;

		this.propsPopup = document.body.createDiv({ cls: 'kanban-props-popup' });
		const popup = this.propsPopup;

		// Position the popup
		const rect = targetBtn.getBoundingClientRect();
		popup.style.position = 'fixed';
		popup.style.top = `${rect.bottom + 5}px`;
		popup.style.right = `${window.innerWidth - rect.right}px`;

		popup.createEl('div', { text: 'Visible Properties', cls: 'kanban-popup-title' });

		// Gather all unique properties from cards
		const allCardProperties = new Set<string>();
		this.cards.forEach(card => {
			if (card.frontmatter) {
				Object.keys(card.frontmatter).forEach(key => {
					// Exclude internal properties
					if (!['position'].includes(key) && key !== this.currentBoard!.columnProperty) {
						allCardProperties.add(key);
					}
				});
			}
		});

		const standardProps = ['title', 'created', 'modified', 'tags'];
		const customProps = Array.from(allCardProperties)
			.filter(p => !standardProps.includes(p))
			.sort();

		const availableProperties = [
			{ key: 'title', label: 'Title' },
			{ key: 'created', label: 'Created Date' },
			{ key: 'modified', label: 'Modified Date' },
			{ key: 'tags', label: 'Tags' },
			...customProps.map(p => ({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
		];

		availableProperties.forEach(prop => {
			const item = popup.createDiv({ cls: 'kanban-popup-item kanban-popup-checkbox-item' });
			
			const checkbox = item.createEl('input', {
				type: 'checkbox',
				cls: 'kanban-popup-checkbox'
			});
			checkbox.checked = this.currentBoard!.visibleProperties.includes(prop.key);

			item.createSpan({ text: prop.label, cls: 'kanban-popup-item-label' });

			const toggleProperty = async () => {
				const currentProps = this.currentBoard!.visibleProperties;
				let newProps: string[];
				
				if (checkbox.checked) {
					newProps = currentProps.includes(prop.key) 
						? currentProps 
						: [...currentProps, prop.key];
				} else {
					newProps = currentProps.filter(p => p !== prop.key);
				}

				// Remove duplicates
				newProps = [...new Set(newProps)];

				this.plugin.boardManager.updateBoard(this.currentBoard!.id, { visibleProperties: newProps });
				await this.plugin.saveSettings();
				await this.refresh();
			};

			item.addEventListener('click', async () => {
				checkbox.checked = !checkbox.checked;
				await toggleProperty();
			});

			checkbox.addEventListener('click', (e) => e.stopPropagation());
			checkbox.addEventListener('change', toggleProperty);
		});

		// Close on click outside
		const closePopup = (e: MouseEvent) => {
			if (!popup.contains(e.target as Node) && e.target !== targetBtn) {
				this.closeAllPopups();
				document.removeEventListener('click', closePopup);
			}
		};
		setTimeout(() => document.addEventListener('click', closePopup), 0);
	}

	private getAllTags(): string[] {
		return this.searchFilterService.getAllTags(this.cards);
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
		await errorHandler.wrap(
			async () => {
				await this.dataManager.updateCardColumn(filePath, newColumn);
				this.cards = await this.dataManager.getKanbanCards();

				// Run automations
				await this.dataManager.runAutomations(this.cards);

				// Re-fetch cards if automations might have changed them (e.g. archived)
				if (this.currentBoard?.autoMoveCompleted || (this.currentBoard?.autoArchiveDelay ?? 0) > 0) {
					this.cards = await this.dataManager.getKanbanCards();
				}

				this.columns = this.dataManager.getColumns(this.cards);
			},
			{ context: 'card-move', action: 'moveCard' }
		)();
	}

	private async archiveCard(card: KanbanCard): Promise<void> {
		await errorHandler.wrap(
			async () => {
				await this.dataManager.archiveCard(card.file);
				// File watcher will trigger refresh automatically
			},
			{ context: 'card-archive', action: 'archiveCard' }
		)();
	}

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}
}
