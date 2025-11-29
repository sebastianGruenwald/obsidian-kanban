import { App, TFile } from 'obsidian';
import { KanbanCard, BoardConfig, KanbanSettings } from './types';
import { getAllTags, sanitizeFileName, showError } from './utils';
import { DEFAULTS } from './constants';

export class DataManager {
	constructor(
		private app: App, 
		private boardConfig: BoardConfig,
		private settings: KanbanSettings
	) {}

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
		return tags.includes(this.boardConfig.tagFilter);
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

			const content = await this.app.vault.read(file);
			const updatedContent = this.updateFrontmatterProperty(content, this.boardConfig.columnProperty, newColumn);
			
			await this.app.vault.modify(file, updatedContent);
		} catch (error) {
			console.error('Error updating card column:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to move card: ${message}`);
			throw error;
		}
	}

	async createNewCard(columnName: string, title: string): Promise<void> {
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

			const frontmatter = {
				[this.boardConfig.columnProperty]: columnName
			};

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
					
					// Ensure frontmatter exists and has the column property
					content = this.updateFrontmatterProperty(content, this.boardConfig.columnProperty, columnName);
					
					// Ensure tag exists
					if (!content.includes(this.boardConfig.tagFilter)) {
						content += `\n\n${this.boardConfig.tagFilter}`;
					}
				} else {
					// Template file not found, fall back to default
					content = this.createFrontmatterContent(frontmatter) + `\n# ${title}\n\n${this.boardConfig.tagFilter}`;
				}
			} else {
				// Default content
				content = this.createFrontmatterContent(frontmatter) + `\n# ${title}\n\n${this.boardConfig.tagFilter}`;
			}
			
			await this.app.vault.create(filePath, content);
		} catch (error) {
			console.error('Error creating new card:', error);
			const message = error instanceof Error ? error.message : 'Unknown error';
			showError(`Failed to create card: ${message}`);
			throw error;
		}
	}

	private createFrontmatterContent(frontmatter: Record<string, any>): string {
		const lines = ['---'];
		for (const [key, value] of Object.entries(frontmatter)) {
			lines.push(`${key}: "${value}"`);
		}
		lines.push('---');
		return lines.join('\n');
	}

	private updateFrontmatterProperty(content: string, property: string, value: string): string {
		const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);

		if (match) {
			// Update existing frontmatter
			const frontmatterContent = match[1];
			const propertyRegex = new RegExp(`^${property}:\\s*.*$`, 'm');
			
			if (propertyRegex.test(frontmatterContent)) {
				// Property exists, update it
				const updatedFrontmatter = frontmatterContent.replace(
					propertyRegex,
					`${property}: "${value}"`
				);
				return content.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
			} else {
				// Property doesn't exist, add it
				const updatedFrontmatter = `${frontmatterContent}\n${property}: "${value}"`;
				return content.replace(frontmatterRegex, `---\n${updatedFrontmatter}\n---`);
			}
		} else {
			// No frontmatter exists, create it
			return `---\n${property}: "${value}"\n---\n\n${content}`;
		}
	}
}