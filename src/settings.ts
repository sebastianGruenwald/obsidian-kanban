import { App, PluginSettingTab, Setting, Modal, TextComponent, DropdownComponent } from 'obsidian';
import KanbanPlugin from './main';
import { BoardConfig, DEFAULT_BOARD } from './types';

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

		// Current board settings
		if (this.currentBoardId) {
			this.displayBoardSettings(containerEl);
		}

		// Global settings
		this.displayGlobalSettings(containerEl);
	}

	private displayBoardManagement(containerEl: HTMLElement): void {
		const boardSection = containerEl.createDiv({ cls: 'setting-section' });
		boardSection.createEl('h3', { text: 'Board Management' });

		// Board selector
		new Setting(boardSection)
			.setName('Active Board')
			.setDesc('Select which board to configure')
			.addDropdown(dropdown => {
				const boards = this.plugin.boardManager.getAllBoards();
				boards.forEach(board => {
					dropdown.addOption(board.id, board.name);
				});
				dropdown.setValue(this.currentBoardId);
				dropdown.onChange(async (value) => {
					this.currentBoardId = value;
					this.plugin.settings.activeBoard = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings
				});
			});

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

		// Delete board button (only if more than one board exists)
		const boards = this.plugin.boardManager.getAllBoards();
		if (boards.length > 1) {
			new Setting(boardSection)
				.setName('Delete Current Board')
				.setDesc('Delete the currently selected board')
				.addButton(button => button
					.setButtonText('Delete Board')
					.setWarning()
					.onClick(async () => {
						const success = this.plugin.boardManager.deleteBoard(this.currentBoardId);
						if (success) {
							const remainingBoards = this.plugin.boardManager.getAllBoards();
							this.currentBoardId = remainingBoards[0].id;
							this.plugin.settings.activeBoard = this.currentBoardId;
							await this.plugin.saveSettings();
							this.plugin.refreshAllViews();
							this.display();
						}
					}));
		}
	}

	private displayBoardSettings(containerEl: HTMLElement): void {
		const board = this.plugin.boardManager.getBoard(this.currentBoardId);
		if (!board) return;

		const boardSection = containerEl.createDiv({ cls: 'setting-section' });
		boardSection.createEl('h3', { text: `Board Settings: ${board.name}` });

		// Board name
		new Setting(boardSection)
			.setName('Board Name')
			.setDesc('Name of this kanban board')
			.addText(text => text
				.setValue(board.name)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(this.currentBoardId, { name: value });
					await this.plugin.saveSettings();
					this.display();
				}));

		// Tag filter
		new Setting(boardSection)
			.setName('Tag filter')
			.setDesc('Only notes with this tag will be included in this board')
			.addText(text => text
				.setPlaceholder('#kanban')
				.setValue(board.tagFilter)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(this.currentBoardId, { tagFilter: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Column property
		new Setting(boardSection)
			.setName('Column property')
			.setDesc('Frontmatter property that determines which column a note belongs to')
			.addText(text => text
				.setPlaceholder('status')
				.setValue(board.columnProperty)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(this.currentBoardId, { columnProperty: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Default columns
		new Setting(boardSection)
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
					this.plugin.boardManager.updateBoard(this.currentBoardId, { defaultColumns: columns });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Custom columns management
		this.displayColumnManagement(boardSection, board);

		// Visible properties
		this.displayVisibleProperties(boardSection, board);

		// Sort settings
		new Setting(boardSection)
			.setName('Sort by')
			.setDesc('How to sort cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('creation', 'Creation date')
				.addOption('modification', 'Modification date')
				.addOption('title', 'Title')
				.addOption('none', 'No sorting')
				.setValue(board.sortBy)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(this.currentBoardId, { sortBy: value as any });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(boardSection)
			.setName('Sort order')
			.setDesc('Sort order for cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('asc', 'Ascending')
				.addOption('desc', 'Descending')
				.setValue(board.sortOrder)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(this.currentBoardId, { sortOrder: value as any });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));
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
						this.plugin.boardManager.removeColumnFromBoard(this.currentBoardId, column);
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
					new AddColumnModalSettings(this.app, this.plugin, this.currentBoardId, () => {
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
						this.plugin.boardManager.updateBoard(this.currentBoardId, { visibleProperties });
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

class CreateBoardModal extends Modal {
	private nameInput: TextComponent;
	private tagInput: TextComponent;

	constructor(app: App, private plugin: KanbanPlugin, private onSubmit: () => void) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create New Board' });

		new Setting(contentEl)
			.setName('Board Name')
			.addText(text => {
				this.nameInput = text;
				text.setPlaceholder('My Kanban Board');
			});

		new Setting(contentEl)
			.setName('Tag Filter')
			.addText(text => {
				this.tagInput = text;
				text.setPlaceholder('#my-tag');
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Create')
				.setCta()
				.onClick(async () => {
					const name = this.nameInput.getValue().trim();
					const tag = this.tagInput.getValue().trim();
					
					if (name && tag) {
						const newBoard = this.plugin.boardManager.createNewBoard(name, tag);
						this.plugin.boardManager.addBoard(newBoard);
						this.plugin.settings.activeBoard = newBoard.id;
						await this.plugin.saveSettings();
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

class AddColumnModalSettings extends Modal {
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