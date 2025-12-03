import { App, Modal, Setting, TextComponent, TFile } from 'obsidian';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';
import { validateBoardName, normalizeTag, showError, showSuccess } from './utils';

/**
 * Available card colors for sticky notes theme
 */
export const CARD_COLORS = [
	{ name: 'No Color', value: 'none', color: 'transparent' },
	{ name: 'Yellow', value: 'yellow', color: '#fff9b1' },
	{ name: 'Pink', value: 'pink', color: '#ffb3ba' },
	{ name: 'Blue', value: 'blue', color: '#bae1ff' },
	{ name: 'Green', value: 'green', color: '#baffc9' },
	{ name: 'Orange', value: 'orange', color: '#ffdfba' },
	{ name: 'Purple', value: 'purple', color: '#e1baff' },
	{ name: 'Coral', value: 'coral', color: '#ffb5a7' },
	{ name: 'Mint', value: 'mint', color: '#b8f3d4' },
	{ name: 'Lavender', value: 'lavender', color: '#d4c1ec' },
	{ name: 'Peach', value: 'peach', color: '#ffd7ba' },
	{ name: 'Sky', value: 'sky', color: '#a2d2ff' },
	{ name: 'Lime', value: 'lime', color: '#d4fc79' }
];

/**
 * Get a random card color value (excludes 'none')
 */
export function getRandomCardColor(): string {
	const colorOptions = CARD_COLORS.filter(c => c.value !== 'none');
	return colorOptions[Math.floor(Math.random() * colorOptions.length)].value;
}

/**
 * Modal for selecting a card color
 */
export class ColorPickerModal extends Modal {
	constructor(
		app: App,
		private filePath: string,
		private currentColor: string | undefined,
		private onSelect: (color: string) => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass('kanban-color-picker-modal');
		contentEl.createEl('h3', { text: 'Choose Card Color' });

		const colorGrid = contentEl.createDiv({ cls: 'kanban-color-grid' });

		for (const color of CARD_COLORS) {
			const colorBtn = colorGrid.createDiv({ cls: 'kanban-color-option' });
			
			if (color.value === 'none') {
				// Special styling for 'no color' option
				colorBtn.addClass('no-color');
				colorBtn.style.background = 'linear-gradient(135deg, var(--background-primary) 45%, var(--background-modifier-border) 45%, var(--background-modifier-border) 55%, var(--background-primary) 55%)';
			} else {
				colorBtn.style.backgroundColor = color.color;
			}
			
			colorBtn.setAttribute('title', color.name);
			
			if (this.currentColor === color.value || (!this.currentColor && color.value === 'none')) {
				colorBtn.addClass('selected');
			}

			colorBtn.addEventListener('click', async () => {
				await this.selectColor(color.value);
			});
		}
	}

	private async selectColor(colorValue: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(this.filePath);
			if (!(file instanceof TFile)) {
				showError('File not found');
				return;
			}

			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				if (colorValue === 'none') {
					// Remove the cardColor property for 'none'
					delete frontmatter['cardColor'];
				} else {
					frontmatter['cardColor'] = colorValue;
				}
			});

			this.onSelect(colorValue);
			this.close();
		} catch (error) {
			console.error('Error changing card color:', error);
			showError('Failed to change card color');
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for creating a new card
 */
export class CreateCardModal extends Modal {
	private titleInput!: TextComponent;

	constructor(
		app: App,
		private dataManager: DataManager,
		private columnName: string,
		private onSubmit: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Create New Card in "${this.columnName}"` });

		new Setting(contentEl)
			.setName('Card Title')
			.setDesc('Enter a name for the new note')
			.addText(text => {
				this.titleInput = text;
				text.setPlaceholder('Enter card title...');
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						this.createCard();
					}
				});
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Create')
				.setCta()
				.onClick(() => this.createCard()))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}

	private async createCard(): Promise<void> {
		const title = this.titleInput.getValue().trim();
		
		if (!title) {
			showError('Card title cannot be empty');
			return;
		}

		try {
			await this.dataManager.createNewCard(this.columnName, title);
			showSuccess('Card created successfully');
			this.close();
			this.onSubmit();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to create card: ${message}`);
			console.error('Error creating card:', error);
		}
	}
}

/**
 * Modal for adding a custom column
 */
export class AddColumnModal extends Modal {
	private columnInput!: TextComponent;

	constructor(
		app: App,
		private plugin: KanbanPlugin,
		private boardId: string,
		private onSubmit: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Add Custom Column' });

		new Setting(contentEl)
			.setName('Column Name')
			.setDesc('Enter a name for the new column')
			.addText(text => {
				this.columnInput = text;
				text.setPlaceholder('New Column');
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						this.addColumn();
					}
				});
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Add')
				.setCta()
				.onClick(() => this.addColumn()))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}

	private async addColumn(): Promise<void> {
		const columnName = this.columnInput.getValue().trim();
		
		if (!columnName) {
			showError('Column name cannot be empty');
			return;
		}

		try {
			const success = this.plugin.boardManager.addColumnToBoard(this.boardId, columnName);
			if (success) {
				await this.plugin.saveSettings();
				this.plugin.refreshAllViews();
				showSuccess('Column added successfully');
				this.close();
				this.onSubmit();
			} else {
				showError('Column already exists');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to add column: ${message}`);
			console.error('Error adding column:', error);
		}
	}
}

/**
 * Modal for renaming a column
 */
export class RenameColumnModal extends Modal {
	private columnInput!: TextComponent;

	constructor(
		app: App,
		private plugin: KanbanPlugin,
		private boardId: string,
		private oldColumnName: string,
		private onSubmit: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Rename Column: ${this.oldColumnName}` });

		new Setting(contentEl)
			.setName('New Column Name')
			.setDesc('Enter the new name for this column')
			.addText(text => {
				this.columnInput = text;
				text.setPlaceholder(this.oldColumnName);
				text.setValue(this.oldColumnName);
				text.inputEl.select();
				text.inputEl.addEventListener('keydown', (e) => {
					if (e.key === 'Enter') {
						this.renameColumn();
					}
				});
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Rename')
				.setCta()
				.onClick(() => this.renameColumn()))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}

	private async renameColumn(): Promise<void> {
		const newColumnName = this.columnInput.getValue().trim();
		
		if (!newColumnName) {
			showError('Column name cannot be empty');
			return;
		}

		if (newColumnName === this.oldColumnName) {
			this.close();
			return;
		}

		try {
			const board = this.plugin.boardManager.getBoard(this.boardId);
			if (!board) {
				showError('Board not found');
				return;
			}

			// Handle renaming for default columns
			if (board.defaultColumns.includes(this.oldColumnName)) {
				const newDefaultColumns = board.defaultColumns.map(col => 
					col === this.oldColumnName ? newColumnName : col
				);
				this.plugin.boardManager.updateBoard(this.boardId, { defaultColumns: newDefaultColumns });
			}
			
			// Handle renaming for custom columns
			if (board.customColumns.includes(this.oldColumnName)) {
				this.plugin.boardManager.removeColumnFromBoard(this.boardId, this.oldColumnName);
				this.plugin.boardManager.addColumnToBoard(this.boardId, newColumnName);
			}

			// Update column order if it exists
			if (board.columnOrder.includes(this.oldColumnName)) {
				const newOrder = board.columnOrder.map(col => 
					col === this.oldColumnName ? newColumnName : col
				);
				this.plugin.boardManager.updateColumnOrder(this.boardId, newOrder);
			}

			await this.plugin.saveSettings();
			this.plugin.refreshAllViews();
			showSuccess('Column renamed successfully');
			this.close();
			this.onSubmit();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to rename column: ${message}`);
			console.error('Error renaming column:', error);
		}
	}
}

/**
 * Modal for creating a new board
 */
export class CreateBoardModal extends Modal {
	private nameInput!: TextComponent;
	private tagInput!: TextComponent;

	constructor(
		app: App,
		private plugin: KanbanPlugin,
		private onSubmit: () => void
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Create New Board' });

		new Setting(contentEl)
			.setName('Board Name')
			.setDesc('Enter a name for the new board')
			.addText(text => {
				this.nameInput = text;
				text.setPlaceholder('My Kanban Board');
			});

		new Setting(contentEl)
			.setName('Tag Filter')
			.setDesc('Only notes with this tag will appear on the board')
			.addText(text => {
				this.tagInput = text;
				text.setPlaceholder('#my-tag');
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Create')
				.setCta()
				.onClick(() => this.createBoard()))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()));
	}

	private async createBoard(): Promise<void> {
		const name = this.nameInput.getValue().trim();
		let tag = this.tagInput.getValue().trim();
		
		const nameValidation = validateBoardName(name);
		if (!nameValidation.valid) {
			showError(nameValidation.error || 'Invalid board name');
			return;
		}

		if (!tag) {
			showError('Tag filter cannot be empty');
			return;
		}

		// Normalize tag to ensure it has # prefix
		tag = normalizeTag(tag);

		try {
			const newBoard = this.plugin.boardManager.createNewBoard(name, tag);
			this.plugin.boardManager.addBoard(newBoard);
			this.plugin.settings.activeBoard = newBoard.id;
			await this.plugin.saveSettings();
			showSuccess('Board created successfully');
			this.close();
			this.onSubmit();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to create board: ${message}`);
			console.error('Error creating board:', error);
		}
	}
}
