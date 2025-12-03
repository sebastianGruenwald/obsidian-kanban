import { App, PluginSettingTab, Setting, TFile, setIcon } from 'obsidian';
import KanbanPlugin from './main';
import { BoardConfig } from './types';
import { CreateBoardModal, AddColumnModal } from './modals';
import { DataManager } from './dataManager';

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
			cls: 'board-settings-toggle'
		});
		setIcon(toggleBtn, isExpanded ? 'chevron-down' : 'chevron-right');

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
			setIcon(toggleBtn, isCurrentlyExpanded ? 'chevron-right' : 'chevron-down');
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

		// Card Density
		new Setting(contentDiv)
			.setName('Card Density')
			.setDesc('Adjust the visual density of cards')
			.addDropdown(dropdown => dropdown
				.addOption('compact', 'Compact')
				.addOption('comfortable', 'Comfortable')
				.addOption('spacious', 'Spacious')
				.setValue(board.cardDensity || 'comfortable')
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { cardDensity: value as any });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Show Card Colors
		new Setting(contentDiv)
			.setName('Show card colors')
			.setDesc('Display individual card colors. When off, all cards use the default style.')
			.addToggle(toggle => toggle
				.setValue(board.showCardColors ?? true)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { showCardColors: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Column Backgrounds
		new Setting(contentDiv)
			.setName('Distinct Column Backgrounds')
			.setDesc('Add a distinct background color to columns to make them stand out')
			.addToggle(toggle => toggle
				.setValue(board.showColumnBackgrounds || false)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { showColumnBackgrounds: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Colorful Headers
		new Setting(contentDiv)
			.setName('Colorful Headers')
			.setDesc('Add a splash of color to column headers')
			.addToggle(toggle => toggle
				.setValue(board.colorfulHeaders !== false) // Default to true if undefined
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { colorfulHeaders: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		// Tag Colors
		this.displayTagColors(contentDiv, board);

		// WIP Limits
		this.displayWipLimits(contentDiv, board);

		// Card Aging
		this.displayCardAging(contentDiv, board);

		// Automation
		this.displayAutomationRules(contentDiv, board);

		// Swimlanes
		this.displaySwimlaneSettings(contentDiv, board);

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

	private displayTagColors(containerEl: HTMLElement, board: BoardConfig): void {
		const tagSection = containerEl.createDiv({ cls: 'tag-colors-section' });
		tagSection.createEl('h4', { text: 'Tag Colors' });
		tagSection.createEl('p', { text: 'Customize colors for tags found in this board.', cls: 'setting-item-description' });

		// Helper to get all unique tags from the board
		// We need to instantiate DataManager temporarily or just rely on what we know.
		// Since we can't easily get cards here without async, we'll just let users add tags manually 
		// OR we can try to scan if we want to be fancy. 
		// For now, let's just list the ones already configured + an add button.

		const configuredTags = Object.keys(board.tagColors || {});

		if (configuredTags.length === 0) {
			tagSection.createDiv({ text: 'No custom tag colors configured.', cls: 'setting-item-description' });
		}

		configuredTags.forEach(tag => {
			const setting = new Setting(tagSection)
				.setName(`#${tag}`)
				.addColorPicker(color => color
					.setValue(board.tagColors[tag])
					.onChange(async (value) => {
						const newColors = { ...board.tagColors, [tag]: value };
						this.plugin.boardManager.updateBoard(board.id, { tagColors: newColors });
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					}))
				.addButton(button => button
					.setIcon('trash')
					.setTooltip('Remove custom color')
					.onClick(async () => {
						const newColors = { ...board.tagColors };
						delete newColors[tag];
						this.plugin.boardManager.updateBoard(board.id, { tagColors: newColors });
						await this.plugin.saveSettings();
						this.display(); // Re-render to remove the item
						this.plugin.refreshAllViews();
					}));
		});

		// Add new tag color
		new Setting(tagSection)
			.setName('Add Tag Color')
			.setDesc('Enter a tag name (without #) to customize its color')
			.addText(text => text
				.setPlaceholder('tag-name')
				.onChange(async (value) => {
					text.inputEl.setAttribute('data-value', value);
				}))
			.addButton(button => button
				.setButtonText('Add')
				.onClick(async () => {
					const input = button.buttonEl.parentElement?.parentElement?.querySelector('input');
					const tag = input?.getAttribute('data-value');
					if (tag) {
						const newColors = { ...board.tagColors, [tag]: '#5c7cfa' }; // Default blue-ish
						this.plugin.boardManager.updateBoard(board.id, { tagColors: newColors });
						await this.plugin.saveSettings();
						this.display();
						this.plugin.refreshAllViews();
					}
				}));
	}

	private displayWipLimits(containerEl: HTMLElement, board: BoardConfig): void {
		const section = containerEl.createDiv({ cls: 'wip-limits-section' });
		section.createEl('h4', { text: 'WIP Limits' });
		section.createEl('p', { text: 'Set maximum number of cards per column. Leave empty or 0 for no limit.', cls: 'setting-item-description' });

		const allColumns = [...board.defaultColumns, ...board.customColumns];

		if (allColumns.length === 0) {
			section.createDiv({ text: 'No columns configured.', cls: 'setting-item-description' });
			return;
		}

		allColumns.forEach(column => {
			new Setting(section)
				.setName(column)
				.addText(text => text
					.setPlaceholder('No limit')
					.setValue(board.wipLimits?.[column]?.toString() || '')
					.onChange(async (value) => {
						const limit = parseInt(value);
						const newLimits = { ...(board.wipLimits || {}) };

						if (!isNaN(limit) && limit > 0) {
							newLimits[column] = limit;
						} else {
							delete newLimits[column];
						}

						this.plugin.boardManager.updateBoard(board.id, { wipLimits: newLimits });
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					}));
		});
	}

	private displayCardAging(containerEl: HTMLElement, board: BoardConfig): void {
		const section = containerEl.createDiv({ cls: 'card-aging-section' });
		section.createEl('h4', { text: 'Card Aging' });
		section.createEl('p', { text: 'Visually age cards that haven\'t been modified in a while.', cls: 'setting-item-description' });

		new Setting(section)
			.setName('Enable Card Aging')
			.setDesc('Fade out cards that are inactive')
			.addToggle(toggle => toggle
				.setValue(board.cardAging || false)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { cardAging: value });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
					this.display(); // Re-render to show/hide threshold setting
				}));

		if (board.cardAging) {
			new Setting(section)
				.setName('Aging Threshold (Days)')
				.setDesc('Number of days before a card starts to age')
				.addSlider(slider => slider
					.setLimits(1, 365, 1)
					.setValue(board.cardAgingThreshold || 7)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.boardManager.updateBoard(board.id, { cardAgingThreshold: value });
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					}));
		}
	}

	private displayAutomationRules(containerEl: HTMLElement, board: BoardConfig): void {
		const section = containerEl.createDiv({ cls: 'automation-section' });
		section.createEl('h4', { text: 'Automation' });
		section.createEl('p', { text: 'Automate common tasks.', cls: 'setting-item-description' });

		new Setting(section)
			.setName('Auto-move Completed Cards')
			.setDesc('Automatically move cards to the last column when all subtasks are checked')
			.addToggle(toggle => toggle
				.setValue(board.autoMoveCompleted || false)
				.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { autoMoveCompleted: value });
					await this.plugin.saveSettings();
				}));

		new Setting(section)
			.setName('Auto-archive Delay (Days)')
			.setDesc('Automatically archive cards in the last column after X days (0 to disable)')
			.addText(text => text
				.setPlaceholder('0')
				.setValue(board.autoArchiveDelay?.toString() || '0')
				.onChange(async (value) => {
					const delay = parseInt(value);
					if (!isNaN(delay) && delay >= 0) {
						this.plugin.boardManager.updateBoard(board.id, { autoArchiveDelay: delay });
						await this.plugin.saveSettings();
					}
				}));
	}

	private displaySwimlaneSettings(containerEl: HTMLElement, board: BoardConfig): void {
		const section = containerEl.createDiv({ cls: 'swimlane-section' });
		section.createEl('h4', { text: 'Swimlanes' });
		section.createEl('p', { text: 'Group cards horizontally by property.', cls: 'setting-item-description' });

		// Scan for available properties
		const availableProperties = new Set<string>();
		// Add standard properties that might be useful for swimlanes
		availableProperties.add('priority');
		availableProperties.add('assignee');
		availableProperties.add('status');

		// We need to get all properties from the cards to populate the dropdown
		// Since this is sync, we might not have access to cards directly here easily without async
		// But we can try to get them via DataManager if we instantiate it, or just use what we have.
		// For a better UX, let's try to get them.

		// Create a dropdown with "None" and available properties
		new Setting(section)
			.setName('Swimlane Property')
			.setDesc('Property to use for swimlanes. Select "None" to disable.')
			.addDropdown(async dropdown => {
				dropdown.addOption('', 'None');

				// Add known properties from board config if any
				if (board.visibleProperties) {
					board.visibleProperties.forEach(p => availableProperties.add(p));
				}

				// Try to scan cards if possible (async)
				try {
					const dataManager = new DataManager(this.app, board, this.plugin.settings);
					const cards = await dataManager.getKanbanCards();
					cards.forEach(card => {
						Object.keys(card.frontmatter).forEach(key => {
							if (key !== board.columnProperty && key !== 'tags') {
								availableProperties.add(key);
							}
						});
					});
				} catch (e) {
					console.error("Could not scan cards for properties", e);
				}

				// Sort and add options
				Array.from(availableProperties).sort().forEach(prop => {
					dropdown.addOption(prop, prop);
				});

				dropdown.setValue(board.swimlaneProperty || '');

				dropdown.onChange(async (value) => {
					this.plugin.boardManager.updateBoard(board.id, { swimlaneProperty: value || null });
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				});
			});
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
						this.plugin.boardManager.removeColumnFromBoard(board.id, column);
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
						let visibleProperties = value 
							? (board.visibleProperties.includes(property) 
								? board.visibleProperties 
								: [...board.visibleProperties, property])
							: board.visibleProperties.filter(p => p !== property);
						// Remove duplicates to fix any existing issues
						visibleProperties = [...new Set(visibleProperties)];
						this.plugin.boardManager.updateBoard(board.id, { visibleProperties });
						await this.plugin.saveSettings();
						this.plugin.refreshAllViews();
					}));
		});

		// Add new property manually
		new Setting(propertiesSection)
			.setName('Add Custom Property')
			.setDesc('Add a frontmatter property to the list')
			.addText(text => text
				.setPlaceholder('property_name')
				.onChange(async (value) => {
					// Just storing the value for the button
					text.inputEl.setAttribute('data-value', value);
				}))
			.addButton(button => button
				.setButtonText('Add')
				.onClick(async () => {
					const input = button.buttonEl.parentElement?.parentElement?.querySelector('input');
					const value = input?.getAttribute('data-value');
					if (value && !uniqueProperties.includes(value)) {
						this.plugin.settings.defaultVisibleProperties.push(value);
						await this.plugin.saveSettings();
						this.display();
					}
				}));

		// Scan for properties button
		new Setting(propertiesSection)
			.setName('Scan for Properties')
			.setDesc('Scan all cards in this board for available properties')
			.addButton(button => button
				.setButtonText('Scan')
				.onClick(async () => {
					button.setButtonText('Scanning...');
					button.setDisabled(true);

					try {
						const dataManager = new DataManager(this.app, board, this.plugin.settings);
						const cards = await dataManager.getKanbanCards();
						const foundProperties = new Set<string>();

						cards.forEach(card => {
							Object.keys(card.frontmatter).forEach(key => {
								if (key !== board.columnProperty) {
									foundProperties.add(key);
								}
							});
						});

						let added = false;
						foundProperties.forEach(prop => {
							if (!this.plugin.settings.defaultVisibleProperties.includes(prop)) {
								this.plugin.settings.defaultVisibleProperties.push(prop);
								added = true;
							}
						});

						if (added) {
							await this.plugin.saveSettings();
							this.display();
						} else {
							button.setButtonText('No new properties found');
							setTimeout(() => {
								button.setButtonText('Scan');
								button.setDisabled(false);
							}, 2000);
						}
					} catch (error) {
						console.error('Error scanning properties:', error);
						button.setButtonText('Error');
					}
				}));
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

		new Setting(globalSection)
			.setName('Card Template')
			.setDesc('Path to a markdown file to use as a template for new cards. Placeholders: {{title}}, {{date}}, {{time}}')
			.addText(text => text
				.setPlaceholder('templates/card-template.md')
				.setValue(this.plugin.settings.cardTemplate)
				.onChange(async (value) => {
					this.plugin.settings.cardTemplate = value;
					await this.plugin.saveSettings();
				}));
	}
}

