import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataManager } from '../src/dataManager';
import { DEFAULT_BOARD, DEFAULT_SETTINGS, BoardConfig } from '../src/types';
import { App, TFile } from './mocks/obsidian';

// Extend the mock App for DataManager tests
function createMockApp() {
    const app = new App();

    // Add fileManager mock
    (app as any).fileManager = {
        processFrontMatter: vi.fn(async (file: TFile, processor: (fm: any) => void) => {
            const fm: Record<string, any> = {};
            processor(fm);
            return Promise.resolve();
        }),
        renameFile: vi.fn()
    };

    return app as any;
}

function createMockFile(path: string, basename: string, frontmatter: Record<string, any> = {}): TFile {
    const file = new TFile();
    file.path = path;
    file.basename = basename;
    file.stat = { ctime: Date.now() - 10000, mtime: Date.now(), size: 100 };
    return file;
}

describe('DataManager', () => {
    let app: any;
    let boardConfig: BoardConfig;
    let dataManager: DataManager;

    beforeEach(() => {
        app = createMockApp();
        boardConfig = { ...DEFAULT_BOARD, tagFilter: '#kanban' };
        dataManager = new DataManager(app, boardConfig, DEFAULT_SETTINGS);
    });

    describe('initialization', () => {
        it('should create a DataManager with the given config', () => {
            expect(dataManager).toBeDefined();
        });

        // Removed updateBoardConfig test - method was removed in refactoring
    });

    describe('getKanbanCards', () => {
        it('should return empty array when no markdown files exist', async () => {
            app.vault.getMarkdownFiles.mockReturnValue([]);
            const cards = await dataManager.getKanbanCards();
            expect(cards).toEqual([]);
        });

        it('should filter cards by tag', async () => {
            const file1 = createMockFile('note1.md', 'note1');
            const file2 = createMockFile('note2.md', 'note2');

            app.vault.getMarkdownFiles.mockReturnValue([file1, file2]);

            // Set up metadata cache to return different tags
            app.metadataCache.getFileCache
                .mockReturnValueOnce({ frontmatter: { tags: ['kanban'], status: 'To Do' } })
                .mockReturnValueOnce({ frontmatter: { tags: ['other'], status: 'To Do' } });

            const cards = await dataManager.getKanbanCards();
            expect(cards.length).toBe(1);
            expect(cards[0].title).toBe('note1');
        });

        it('should parse dueDate from frontmatter', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getMarkdownFiles.mockReturnValue([file]);

            const dueDate = '2024-12-25';
            app.metadataCache.getFileCache.mockReturnValue({
                frontmatter: { tags: ['kanban'], status: 'To Do', dueDate }
            });

            const cards = await dataManager.getKanbanCards();
            expect(cards.length).toBe(1);
            expect(cards[0].dueDate).toBe(Date.parse(dueDate));
        });

        it('should set column from columnProperty in frontmatter', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getMarkdownFiles.mockReturnValue([file]);

            app.metadataCache.getFileCache.mockReturnValue({
                frontmatter: { tags: ['kanban'], status: 'In Progress' }
            });

            const cards = await dataManager.getKanbanCards();
            expect(cards.length).toBe(1);
            expect(cards[0].column).toBe('In Progress');
        });
    });

    describe('updateCardColumn', () => {
        it('should update a card column via processFrontMatter', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            await dataManager.updateCardColumn('task.md', 'Done');

            expect(app.fileManager.processFrontMatter).toHaveBeenCalledWith(
                file,
                expect.any(Function)
            );
        });

        it('should throw error if file not found', async () => {
            app.vault.getAbstractFileByPath.mockReturnValue(null);

            await expect(dataManager.updateCardColumn('nonexistent.md', 'Done'))
                .rejects.toThrow('File not found');
        });
    });

    describe('updateCardDueDate', () => {
        it('should set dueDate in frontmatter', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            let capturedFm: any = null;
            app.fileManager.processFrontMatter.mockImplementation(
                async (f: TFile, processor: (fm: any) => void) => {
                    capturedFm = {};
                    processor(capturedFm);
                }
            );

            await dataManager.updateCardDueDate('task.md', '2024-12-25');

            expect(capturedFm.dueDate).toBe('2024-12-25');
        });

        it('should delete dueDate when null is passed', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            let capturedFm: any = null;
            app.fileManager.processFrontMatter.mockImplementation(
                async (f: TFile, processor: (fm: any) => void) => {
                    capturedFm = { dueDate: '2024-12-25' };
                    processor(capturedFm);
                }
            );

            await dataManager.updateCardDueDate('task.md', null);

            expect(capturedFm.dueDate).toBeUndefined();
        });
    });

    describe('updateCardTags', () => {
        it('should update tags in frontmatter', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            let capturedFm: any = null;
            app.fileManager.processFrontMatter.mockImplementation(
                async (f: TFile, processor: (fm: any) => void) => {
                    capturedFm = {};
                    processor(capturedFm);
                }
            );

            await dataManager.updateCardTags('task.md', ['kanban', 'urgent']);

            expect(capturedFm.tags).toEqual(['kanban', 'urgent']);
        });

        it('should remove # prefix from tags', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            let capturedFm: any = null;
            app.fileManager.processFrontMatter.mockImplementation(
                async (f: TFile, processor: (fm: any) => void) => {
                    capturedFm = {};
                    processor(capturedFm);
                }
            );

            await dataManager.updateCardTags('task.md', ['#kanban', '#urgent']);

            expect(capturedFm.tags).toEqual(['kanban', 'urgent']);
        });

        it('should delete tags property when empty array passed', async () => {
            const file = createMockFile('task.md', 'task');
            app.vault.getAbstractFileByPath.mockReturnValue(file);

            let capturedFm: any = null;
            app.fileManager.processFrontMatter.mockImplementation(
                async (f: TFile, processor: (fm: any) => void) => {
                    capturedFm = { tags: ['existing'] };
                    processor(capturedFm);
                }
            );

            await dataManager.updateCardTags('task.md', []);

            expect(capturedFm.tags).toBeUndefined();
        });
    });

    describe('getAllVaultTags', () => {
        it('should return tags from all files in vault', () => {
            const file1 = createMockFile('note1.md', 'note1');
            const file2 = createMockFile('note2.md', 'note2');

            app.vault.getMarkdownFiles.mockReturnValue([file1, file2]);
            app.metadataCache.getFileCache
                .mockReturnValueOnce({ frontmatter: { tags: ['tag1', 'tag2'] } })
                .mockReturnValueOnce({ frontmatter: { tags: ['tag2', 'tag3'] } });

            const tags = dataManager.getAllVaultTags();

            expect(tags).toContain('tag1');
            expect(tags).toContain('tag2');
            expect(tags).toContain('tag3');
        });
    });
});
