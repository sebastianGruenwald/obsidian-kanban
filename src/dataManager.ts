import { App, TFile } from 'obsidian';
import { KanbanCard, BoardConfig, KanbanSettings } from './types';
import { getAllTags, sanitizeFileName, showError } from './utils';
import { DEFAULTS } from './constants';
import { getRandomCardColor } from './modals';

export class DataManager {
	constructor(
		private app: App,
		private boardConfig: BoardConfig,
		private settings: KanbanSettings
	) { }

	async getKanbanCards(): Promise<KanbanCard[]> {
		try {
			const files = this.app.vault.getMarkdownFiles();
			const cards: KanbanCard[] = [];

			for (const file of files) {
				if (await this.shouldIncludeFile(file)) {
					const card = await this.createCardFromFile(file);
					if (card) {
						cards.push(card);
					}
				}
			}

			return this.sortCards(cards);
		} catch (error) {
			console.error('Error getting kanban cards:', error);
			showError('Failed to load kanban cards');
			return [];
		}
	}

	private async shouldIncludeFile(file: TFile): Promise<boolean> {
		const cache = this.app.metadataCache.getFileCache(file);

		// Check if file has the required tag
		const tags = getAllTags(cache);
		if (!tags.includes(this.boardConfig.tagFilter)) {
			return false;
		}

		// Check if archived
		if (cache?.frontmatter?.archived === true) {
			return false;
		}

		return true;
	}

	private async createCardFromFile(file: TFile): Promise<KanbanCard | null> {
		try {
			const cache = this.app.metadataCache.getFileCache(file);
			const content = await this.app.vault.read(file);

			const frontmatter = cache?.frontmatter || {};
			const column = frontmatter[this.boardConfig.columnProperty] || DEFAULTS.UNCATEGORIZED_COLUMN;

			return {
				file: file.path,
				title: file.basename,
				column: column,
				created: file.stat.ctime,
				modified: file.stat.mtime,
				content: content,
				frontmatter: frontmatter
			};
		} catch (error) {
			console.error(`Error creating card from file ${file.path}:`, error);
			return null;
		}
	}

	private sortCards(cards: KanbanCard[]): KanbanCard[] {
		if (this.boardConfig.sortBy === 'none') {
			return cards;
		}

		return cards.sort((a, b) => {
			let comparison = 0;

			switch (this.boardConfig.sortBy) {
				case 'creation':
					comparison = a.created - b.created;
					break;
				case 'modification':
					comparison = a.modified - b.modified;
					break;
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				default:
					// Sort by frontmatter property
					const prop = this.boardConfig.sortBy;
					const valA = a.frontmatter[prop];
					const valB = b.frontmatter[prop];

					if (valA === valB) comparison = 0;
					else if (valA === undefined || valA === null) comparison = -1;
					else if (valB === undefined || valB === null) comparison = 1;
					else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
					else comparison = String(valA).localeCompare(String(valB));
					break;
			}

			return this.boardConfig.sortOrder === 'desc' ? -comparison : comparison;
		});
	}

	getColumns(cards: KanbanCard[]): string[] {
		const columnsFromCards = [...new Set(cards.map(card => card.column))];
		const allColumns = [...new Set([...this.boardConfig.defaultColumns, ...this.boardConfig.customColumns, ...columnsFromCards])];

		// Apply custom column order if set
		if (this.boardConfig.columnOrder.length > 0) {
			const orderedColumns = this.boardConfig.columnOrder.filter(col => allColumns.includes(col));
			const remainingColumns = allColumns.filter(col => !this.boardConfig.columnOrder.includes(col));
			return [...orderedColumns, ...remainingColumns];
		}

		return allColumns;
	}

	async updateCardColumn(cardPath: string, newColumn: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(cardPath);
			if (!(file instanceof TFile)) {
				throw new Error('File not found');
			}

			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter[this.boardConfig.columnProperty] = newColumn;
			});
		} catch (error) {
			console.error('Error updating card column:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to move card: ${message}`);
			throw error;
		}
	}

	async archiveCard(cardPath: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(cardPath);
			if (!(file instanceof TFile)) {
				throw new Error('File not found');
			}

			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter['archived'] = true;
			});
		} catch (error) {
			console.error('Error archiving card:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to archive card: ${message}`);
			throw error;
		}
	}

	async createNewCard(columnName: string, title: string, cardColor?: string): Promise<void> {
		try {
			const sanitizedTitle = sanitizeFileName(title);
			if (!sanitizedTitle) {
				throw new Error('Invalid card title');
			}

			const fileName = `${sanitizedTitle}.md`;
			let filePath = fileName;

			// Check if file already exists, if so, add a number
			let counter = 1;
			while (this.app.vault.getAbstractFileByPath(filePath)) {
				const nameWithoutExt = fileName.replace('.md', '');
				filePath = `${nameWithoutExt} ${counter}.md`;
				counter++;
			}

			// Create the file first
			let content = '';
			if (this.settings.cardTemplate) {
				// Use template
				const templateFile = this.app.vault.getAbstractFileByPath(this.settings.cardTemplate);
				if (templateFile instanceof TFile) {
					content = await this.app.vault.read(templateFile);
					// Replace placeholders
					content = content.replace(/{{title}}/g, title);
					content = content.replace(/{{date}}/g, new Date().toISOString().split('T')[0]);
					content = content.replace(/{{time}}/g, new Date().toLocaleTimeString());
				} else {
					content = `# ${title}`;
				}
			} else {
				content = `# ${title}`;
			}

			const newFile = await this.app.vault.create(filePath, content);

			// Use provided color or generate a random one
			const finalCardColor = cardColor || getRandomCardColor();

			// Then use processFrontMatter to set metadata safely
			await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
				frontmatter[this.boardConfig.columnProperty] = columnName;
				frontmatter['cardColor'] = finalCardColor;

				// Ensure tag exists in frontmatter tags if not in content
				// Note: This is a simple way to add the tag. 
				// Ideally we check if it's in the content, but for now adding to frontmatter is safe.
				if (!content.includes(this.boardConfig.tagFilter)) {
					const tag = this.boardConfig.tagFilter.replace('#', '');
					if (!frontmatter.tags) {
						frontmatter.tags = [tag];
					} else if (Array.isArray(frontmatter.tags)) {
						if (!frontmatter.tags.includes(tag)) {
							frontmatter.tags.push(tag);
						}
					} else {
						// String tag
						if (frontmatter.tags !== tag) {
							frontmatter.tags = [frontmatter.tags, tag];
						}
					}
				}
			});

		} catch (error) {
			console.error('Error creating new card:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to create card: ${message}`);
			throw error;
		}
	}

	async updateCardTitle(cardPath: string, newTitle: string): Promise<void> {
		try {
			const file = this.app.vault.getAbstractFileByPath(cardPath);
			if (!(file instanceof TFile)) {
				throw new Error('File not found');
			}

			// Rename the file
			const sanitizedTitle = sanitizeFileName(newTitle);
			if (!sanitizedTitle) {
				throw new Error('Invalid card title');
			}

			const newPath = file.path.replace(file.name, `${sanitizedTitle}.md`);
			await this.app.fileManager.renameFile(file, newPath);
		} catch (error) {
			console.error('Error updating card title:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to rename card: ${message}`);
			throw error;
		}
	}

	// Helper methods removed as they are replaced by app.fileManager.processFrontMatter

	async runAutomations(cards: KanbanCard[]): Promise<void> {
		if (!this.boardConfig.autoMoveCompleted && !this.boardConfig.autoArchiveDelay) {
			return;
		}

		const lastColumn = this.boardConfig.columnOrder.length > 0
			? this.boardConfig.columnOrder[this.boardConfig.columnOrder.length - 1]
			: this.boardConfig.defaultColumns[this.boardConfig.defaultColumns.length - 1];

		for (const card of cards) {
			// Auto-move completed cards
			if (this.boardConfig.autoMoveCompleted && card.column !== lastColumn) {
				if (this.isCardCompleted(card)) {
					await this.updateCardColumn(card.file, lastColumn);
					// Update local card object to reflect change for subsequent checks
					card.column = lastColumn;
				}
			}

			// Auto-archive old cards in the last column
			if (this.boardConfig.autoArchiveDelay > 0 && card.column === lastColumn) {
				const daysSinceModified = (Date.now() - card.modified) / (1000 * 60 * 60 * 24);
				if (daysSinceModified > this.boardConfig.autoArchiveDelay) {
					await this.archiveCard(card.file);
				}
			}
		}
	}

	private isCardCompleted(card: KanbanCard): boolean {
		const regex = /- \[([ x])\]/g;
		const matches = [...card.content.matchAll(regex)];

		if (matches.length === 0) return false; // No tasks, not "completed"

		const allChecked = matches.every(match => match[1] === 'x');
		return allChecked;
	}
}