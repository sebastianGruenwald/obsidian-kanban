import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataManager } from '../src/dataManager';
import { BoardConfig, DEFAULT_BOARD, KanbanSettings, DEFAULT_SETTINGS } from '../src/types';
import { TFile } from './mocks/obsidian';

// Mock Obsidian App
const createMockApp = () => ({
	vault: {
		getMarkdownFiles: vi.fn(() => []),
		read: vi.fn(() => Promise.resolve('')),
		create: vi.fn(),
		getAbstractFileByPath: vi.fn(),
	},
	metadataCache: {
		getFileCache: vi.fn(),
		getFirstLinkpathDest: vi.fn(),
	},
	fileManager: {
		processFrontMatter: vi.fn((file, fn) => {
			const frontmatter = {};
			fn(frontmatter);
			return Promise.resolve();
		}),
		renameFile: vi.fn(),
	},
});

describe('DataManager', () => {
	let dataManager: DataManager;
	let mockApp: any;
	let boardConfig: BoardConfig;
	let settings: KanbanSettings;

	beforeEach(() => {
		mockApp = createMockApp();
		boardConfig = { ...DEFAULT_BOARD };
		settings = { ...DEFAULT_SETTINGS };
		dataManager = new DataManager(mockApp, boardConfig, settings);
	});

	describe('getKanbanCards', () => {
		it('should return empty array when no files', async () => {
			mockApp.vault.getMarkdownFiles.mockReturnValue([]);
			const cards = await dataManager.getKanbanCards();
			expect(cards).toEqual([]);
		});

		it('should filter files by tag', async () => {
			const mockFile = {
				path: 'test.md',
				basename: 'test',
				stat: { ctime: 1000, mtime: 2000 },
			};

			mockApp.vault.getMarkdownFiles.mockReturnValue([mockFile]);
			mockApp.metadataCache.getFileCache.mockReturnValue({
				frontmatter: { tags: ['kanban', 'project'] },
			});
			mockApp.vault.read.mockResolvedValue('# Test');

			const cards = await dataManager.getKanbanCards();
			expect(cards).toHaveLength(1);
			expect(cards[0].title).toBe('test');
		});

		it('should exclude archived cards', async () => {
			const mockFile = {
				path: 'test.md',
				basename: 'test',
				stat: { ctime: 1000, mtime: 2000 },
			};

			mockApp.vault.getMarkdownFiles.mockReturnValue([mockFile]);
			mockApp.metadataCache.getFileCache.mockReturnValue({
				frontmatter: { tags: ['kanban'], archived: true },
			});

			const cards = await dataManager.getKanbanCards();
			expect(cards).toHaveLength(0);
		});
	});

	describe('getColumns', () => {
		it('should return default columns when no cards', () => {
			const columns = dataManager.getColumns([]);
			expect(columns).toEqual(boardConfig.defaultColumns);
		});

		it('should include custom columns', () => {
			boardConfig.customColumns = ['Custom Column'];
			dataManager = new DataManager(mockApp, boardConfig, settings);
			
			const columns = dataManager.getColumns([]);
			expect(columns).toContain('Custom Column');
		});

		it('should respect column order', () => {
			const cards = [
				{
					file: 'test1.md',
					title: 'Test 1',
					column: 'Done',
					created: 1000,
					modified: 2000,
					content: '',
					frontmatter: {},
				},
				{
					file: 'test2.md',
					title: 'Test 2',
					column: 'To Do',
					created: 1000,
					modified: 2000,
					content: '',
					frontmatter: {},
				},
			];

			boardConfig.columnOrder = ['To Do', 'In Progress', 'Done'];
			dataManager = new DataManager(mockApp, boardConfig, settings);
			
			const columns = dataManager.getColumns(cards);
			expect(columns[0]).toBe('To Do');
			expect(columns[columns.length - 1]).toBe('Done');
		});
	});

	describe('updateCardColumn', () => {
		it('should update card column in frontmatter', async () => {
			const mockFile = new TFile();
			mockFile.path = 'test.md';
			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);

			await dataManager.updateCardColumn('test.md', 'In Progress');
			
			expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledWith(
				mockFile,
				expect.any(Function)
			);
		});

		it('should throw error if file not found', async () => {
			mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

			await expect(
				dataManager.updateCardColumn('nonexistent.md', 'Done')
			).rejects.toThrow();
		});
	});

	describe('archiveCard', () => {
		it('should set archived flag in frontmatter', async () => {
			const mockFile = new TFile();
			mockFile.path = 'test.md';
			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);

			let frontmatterUpdated = false;
			mockApp.fileManager.processFrontMatter.mockImplementation((_file: any, fn: any) => {
				const fm: any = {};
				fn(fm);
				frontmatterUpdated = fm.archived === true;
				return Promise.resolve();
			});

			await dataManager.archiveCard('test.md');
			
			expect(frontmatterUpdated).toBe(true);
		});
	});

	describe('createNewCard', () => {
		it('should create new file with proper frontmatter', async () => {
			const mockFile = { path: 'New Card.md' };
			mockApp.vault.create.mockResolvedValue(mockFile);
			mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

			await dataManager.createNewCard('To Do', 'New Card');

			expect(mockApp.vault.create).toHaveBeenCalledWith(
				'New Card.md',
				expect.stringContaining('# New Card')
			);
		});

		it('should handle duplicate filenames', async () => {
			mockApp.vault.getAbstractFileByPath
				.mockReturnValueOnce({ path: 'Card.md' }) // First exists
				.mockReturnValueOnce(null); // Second doesn't

			const mockFile = { path: 'Card 1.md' };
			mockApp.vault.create.mockResolvedValue(mockFile);

			await dataManager.createNewCard('To Do', 'Card');

			expect(mockApp.vault.create).toHaveBeenCalledWith(
				'Card 1.md',
				expect.any(String)
			);
		});

		it('should sanitize invalid filenames', async () => {
			mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
			const mockFile = { path: 'Test.md' };
			mockApp.vault.create.mockResolvedValue(mockFile);

			await dataManager.createNewCard('To Do', 'Test: Invalid | Name?');

			expect(mockApp.vault.create).toHaveBeenCalledWith(
				expect.stringMatching(/^Test Invalid Name/),
				expect.any(String)
			);
		});
	});

	describe('sortCards', () => {
		it('should sort by creation date ascending', () => {
			const cards = [
				{ created: 3000, modified: 3000, title: 'C', file: 'c.md', column: 'To Do', content: '', frontmatter: {} },
				{ created: 1000, modified: 1000, title: 'A', file: 'a.md', column: 'To Do', content: '', frontmatter: {} },
				{ created: 2000, modified: 2000, title: 'B', file: 'b.md', column: 'To Do', content: '', frontmatter: {} },
			];

			boardConfig.sortBy = 'creation';
			boardConfig.sortOrder = 'asc';
			dataManager = new DataManager(mockApp, boardConfig, settings);

			const sorted = dataManager['sortCards'](cards);
			expect(sorted[0].title).toBe('A');
			expect(sorted[2].title).toBe('C');
		});

		it('should sort by title descending', () => {
			const cards = [
				{ created: 1000, modified: 1000, title: 'Alpha', file: 'a.md', column: 'To Do', content: '', frontmatter: {} },
				{ created: 1000, modified: 1000, title: 'Charlie', file: 'c.md', column: 'To Do', content: '', frontmatter: {} },
				{ created: 1000, modified: 1000, title: 'Bravo', file: 'b.md', column: 'To Do', content: '', frontmatter: {} },
			];

			boardConfig.sortBy = 'title';
			boardConfig.sortOrder = 'desc';
			dataManager = new DataManager(mockApp, boardConfig, settings);

			const sorted = dataManager['sortCards'](cards);
			expect(sorted[0].title).toBe('Charlie');
			expect(sorted[2].title).toBe('Alpha');
		});

		it('should not sort when sortBy is none', () => {
			const cards = [
				{ created: 3000, modified: 3000, title: 'C', file: 'c.md', column: 'To Do', content: '', frontmatter: {} },
				{ created: 1000, modified: 1000, title: 'A', file: 'a.md', column: 'To Do', content: '', frontmatter: {} },
			];

			boardConfig.sortBy = 'none';
			dataManager = new DataManager(mockApp, boardConfig, settings);

			const sorted = dataManager['sortCards'](cards);
			expect(sorted[0].title).toBe('C');
			expect(sorted[1].title).toBe('A');
		});
	});

	describe('isCardCompleted', () => {
		it('should detect completed cards with all tasks checked', () => {
			const card = {
				file: 'test.md',
				title: 'Test',
				column: 'To Do',
				created: 1000,
				modified: 2000,
				content: '- [x] Task 1\n- [x] Task 2',
				frontmatter: {},
			};

			const result = dataManager['isCardCompleted'](card);
			expect(result).toBe(true);
		});

		it('should detect incomplete cards', () => {
			const card = {
				file: 'test.md',
				title: 'Test',
				column: 'To Do',
				created: 1000,
				modified: 2000,
				content: '- [x] Task 1\n- [ ] Task 2',
				frontmatter: {},
			};

			const result = dataManager['isCardCompleted'](card);
			expect(result).toBe(false);
		});

		it('should return false for cards without tasks', () => {
			const card = {
				file: 'test.md',
				title: 'Test',
				column: 'To Do',
				created: 1000,
				modified: 2000,
				content: 'Just some text',
				frontmatter: {},
			};

			const result = dataManager['isCardCompleted'](card);
			expect(result).toBe(false);
		});
	});
});
