import { App, PluginSettingTab, Setting } from 'obsidian';
import KanbanPlugin from './main';
import { BoardConfig } from './types';
import { CreateBoardModal, AddColumnModal } from './modals';

export class KanbanSettingTab extends PluginSettingTab {
	plugin: KanbanPlugin;
	private currentBoardId: string;

	constructor(app: App, plugin: KanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.currentBoardId = this.plugin.settings.activeBoard;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Kanban Board Settings' });

		// Board selection and management
		this.displayBoardManagement(containerEl);

		// All boards settings
		this.displayAllBoardsSettings(containerEl);

		// Global settings
		this.displayGlobalSettings(containerEl);
	}

	private displayBoardManagement(containerEl: HTMLElement): void {
		const boardSection = containerEl.createDiv({ cls: 'setting-section' });
		boardSection.createEl('h3', { text: 'Board Management' });

		// Add new board button
		new Setting(boardSection)
			.setName('Create New Board')
			.setDesc('Add a new kanban board')
			.addButton(button => button
				.setButtonText('Create Board')
				.onClick(() => {
					new CreateBoardModal(this.app, this.plugin, () => {
						this.display();
					}).open();
				}));
	}

	private displayAllBoardsSettings(containerEl: HTMLElement): void {
		const boards = this.plugin.boardManager.getAllBoards();
		
		boards.forEach(board => {
			this.displayBoardSettings(containerEl, board);
		});
	}

	private displayBoardSettings(containerEl: HTMLElement, board: BoardConfig): void {
		const boardSection = containerEl.createDiv({ cls: 'setting-section board-settings' });
		
		// Expandable header
		const headerDiv = boardSection.createDiv({ cls: 'board-settings-header' });
		const isExpanded = board.id === this.currentBoardId;
		
		const toggleBtn = headerDiv.createEl('button', { 
			text: isExpanded ? '▼' : '▶',
			cls: 'board-settings-toggle'
		});
		
		headerDiv.createEl('h3', { 
			text: `${board.name}${board.id === this.plugin.settings.activeBoard ? ' (Active)' : ''}`,
			cls: 'board-settings-title'
		});
		
		const contentDiv = boardSection.createDiv({ 
			cls: 'board-settings-content',
			attr: { style: isExpanded ? 'display: block' : 'display: none' }
		});
		
		toggleBtn.addEventListener('click', () => {
			const isCurrentlyExpanded = contentDiv.style.display === 'block';
			contentDiv.style.display = isCurrentlyExpanded ? 'none' : 'block';
			toggleBtn.setText(isCurrentlyExpanded ? '▶' : '▼');
			this.currentBoardId = isCurrentlyExpanded ? '' : board.id;
		});

		// Board name
		new Setting(contentDiv)
			.setName('Board Name')
			.setDesc('Name of this kanban board')
			.addText(text => text
				.setValue(board.name)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { name: value });
					await this.plugin.saveSettings();
					this.display();
				}));

		// Tag filter
		new Setting(contentDiv)
			.setName('Tag filter')
			.setDesc('Only notes with this tag will be included in this board')
			.addText(text => text
				.setPlaceholder('#kanban')
				.setValue(board.tagFilter)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { tagFilter: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Column property
		new Setting(contentDiv)
			.setName('Column property')
			.setDesc('Frontmatter property that determines which column a note belongs to')
			.addText(text => text
				.setPlaceholder('status')
				.setValue(board.columnProperty)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { columnProperty: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Default columns
		new Setting(contentDiv)
			.setName('Default columns')
			.setDesc('Columns that will always appear, even if empty (comma-separated)')
			.addTextArea(text => text
				.setPlaceholder('To Do, In Progress, Done')
				.setValue(board.defaultColumns.join(', '))
				.onChange(async (value) => {
					const columns = value
						.split(',')
						.map(col => col.trim())
						.filter(col => col.length > 0);
					this.plugin.boardManager.updateBoard(board.id, { defaultColumns: columns });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Custom columns management
		this.displayColumnManagement(contentDiv, board);

		// Visible properties
		this.displayVisibleProperties(contentDiv, board);

		// Sort settings
		new Setting(contentDiv)
			.setName('Sort by')
			.setDesc('How to sort cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('creation', 'Creation date')
				.addOption('modification', 'Modification date')
				.addOption('title', 'Title')
				.addOption('none', 'No sorting')
				.setValue(board.sortBy)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { sortBy: value as any });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(contentDiv)
			.setName('Sort order')
			.setDesc('Sort order for cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('asc', 'Ascending')
				.addOption('desc', 'Descending')
				.setValue(board.sortOrder)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { sortOrder: value as any });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Delete board button (only if more than one board exists)
		const allBoards = this.plugin.boardManager.getAllBoards();
		if (allBoards.length > 1) {
			new Setting(contentDiv)
				.setName('Delete Board')
				.setDesc(`Delete the "${board.name}" board permanently`)
				.addButton(button => button
					.setButtonText('Delete Board')
					.setWarning()
					.onClick(async () => {
						const success = this.plugin.boardManager.deleteBoard(board.id);
						if (success) {
							// If this was the active board, switch to another one
							if (board.id === this.plugin.settings.activeBoard) {
								const remainingBoards = this.plugin.boardManager.getAllBoards();
								this.plugin.settings.activeBoard = remainingBoards[0].id;
							}
							await this.plugin.saveSettings();
							this.plugin.refreshAllViews();
							this.display();
						}
					}));
		}
	}

	private displayColumnManagement(containerEl: HTMLElement, board: BoardConfig): void {
		const columnSection = containerEl.createDiv({ cls: 'column-management' });
		columnSection.createEl('h4', { text: 'Custom Columns' });

		// Display existing custom columns
		board.customColumns.forEach(column => {
			new Setting(columnSection)
				.setName(column)
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.boardManager.removeColumnFromBoard(board.name, column);
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
						this.display();
					}));
		});

		// Add new column
		new Setting(columnSection)
			.setName('Add Custom Column')
			.setDesc('Add a new column to this board')
			.addButton(button => button
				.setButtonText('Add Column')
				.onClick(() => {
					new AddColumnModal(this.app, this.plugin, board.id, () => {
						this.display();
					}).open();
				}));
	}

	private displayVisibleProperties(containerEl: HTMLElement, board: BoardConfig): void {
		const propertiesSection = containerEl.createDiv({ cls: 'visible-properties' });
		propertiesSection.createEl('h4', { text: 'Visible Properties' });

		const availableProperties = ['title', 'created', 'modified', 'tags', ...this.plugin.settings.defaultVisibleProperties];
		const uniqueProperties = [...new Set(availableProperties)];

		uniqueProperties.forEach(property => {
			new Setting(propertiesSection)
				.setName(property.charAt(0).toUpperCase() + property.slice(1))
				.addToggle(toggle => toggle
					.setValue(board.visibleProperties.includes(property))
					.onChange(async (value) => {
						const visibleProperties = value 
							? [...board.visibleProperties, property]
							: board.visibleProperties.filter(p => p !== property);
						this.plugin.boardManager.updateBoard(board.name, { visibleProperties });
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					}));
		});
	}

	private displayGlobalSettings(containerEl: HTMLElement): void {
		const globalSection = containerEl.createDiv({ cls: 'setting-section' });
		globalSection.createEl('h3', { text: 'Global Settings' });

		new Setting(globalSection)
			.setName('Auto-refresh')
			.setDesc('Automatically refresh the kanban board when files change')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}));

		new Setting(globalSection)
			.setName('Show file count')
			.setDesc('Show the number of files in each column header')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFileCount)
				.onChange(async (value) => {
					this.plugin.settings.showFileCount = value;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));
	}
}

