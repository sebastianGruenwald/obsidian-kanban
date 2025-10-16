import { TFile, FrontMatterCache, CachedMetadata } from 'obsidian';
import { KanbanCard, BoardConfig } from './types';

export class DataManager {
	constructor(private app: any, private boardConfig: BoardConfig) {}

	async getKanbanCards(): Promise<KanbanCard[]> {
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
	}

	private async shouldIncludeFile(file: TFile): Promise<boolean> {
		const cache = this.app.metadataCache.getFileCache(file);
		
		// Check if file has the required tag
		const tags = this.getAllTags(cache);
		return tags.includes(this.boardConfig.tagFilter);
	}

	private getAllTags(cache: CachedMetadata | null): string[] {
		if (!cache) return [];
		
		const tags: string[] = [];
		
		// Get tags from frontmatter
		if (cache.frontmatter?.tags) {
			const frontmatterTags = Array.isArray(cache.frontmatter.tags) 
				? cache.frontmatter.tags 
				: [cache.frontmatter.tags];
			tags.push(...frontmatterTags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`));
		}
		
		// Get tags from content
		if (cache.tags) {
			tags.push(...cache.tags.map(tagCache => tagCache.tag));
		}
		
		return tags;
	}

	private async createCardFromFile(file: TFile): Promise<KanbanCard | null> {
		const cache = this.app.metadataCache.getFileCache(file);
		const content = await this.app.vault.read(file);
		
		const frontmatter = cache?.frontmatter || {};
		const column = frontmatter[this.boardConfig.columnProperty] || 'Uncategorized';
		
		return {
			file: file.path,
			title: file.basename,
			column: column,
			created: file.stat.ctime,
			modified: file.stat.mtime,
			content: content,
			frontmatter: frontmatter
		};
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
		const file = this.app.vault.getAbstractFileByPath(cardPath);
		if (!(file instanceof TFile)) return;

		const content = await this.app.vault.read(file);
		const updatedContent = this.updateFrontmatterProperty(content, this.boardConfig.columnProperty, newColumn);
		
		await this.app.vault.modify(file, updatedContent);
	}

	async createNewCard(columnName: string, title: string): Promise<void> {
		const fileName = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim()}.md`;
		const filePath = `${fileName}`;
		
		// Check if file already exists, if so, add a number
		let finalPath = filePath;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const nameWithoutExt = fileName.replace('.md', '');
			finalPath = `${nameWithoutExt} ${counter}.md`;
			counter++;
		}

		const frontmatter = {
			[this.boardConfig.columnProperty]: columnName
		};

		const content = this.createFrontmatterContent(frontmatter) + `\n# ${title}\n\n${this.boardConfig.tagFilter}`;
		
		await this.app.vault.create(finalPath, content);
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