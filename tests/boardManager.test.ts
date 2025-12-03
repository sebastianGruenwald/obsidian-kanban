import { describe, it, expect, beforeEach } from 'vitest';
import { BoardManager } from '../src/boardManager';
import { BoardConfig, DEFAULT_BOARD } from '../src/types';

describe('BoardManager', () => {
	let manager: BoardManager;
	let testBoards: BoardConfig[];

	beforeEach(() => {
		testBoards = [
			{ ...DEFAULT_BOARD, id: 'board1', name: 'Board 1', tagFilter: '#tag1' },
			{ ...DEFAULT_BOARD, id: 'board2', name: 'Board 2', tagFilter: '#tag2' }
		];
		manager = new BoardManager(testBoards);
	});

	describe('getBoard', () => {
		it('should return board by ID', () => {
			const board = manager.getBoard('board1');
			expect(board).toBeDefined();
			expect(board?.name).toBe('Board 1');
		});

		it('should return null for non-existent board', () => {
			const board = manager.getBoard('nonexistent');
			expect(board).toBeNull();
		});
	});

	describe('getAllBoards', () => {
		it('should return all boards', () => {
			const boards = manager.getAllBoards();
			expect(boards).toHaveLength(2);
			expect(boards[0].id).toBe('board1');
			expect(boards[1].id).toBe('board2');
		});

		it('should return a copy, not the original array', () => {
			const boards = manager.getAllBoards();
			boards.push({ ...DEFAULT_BOARD, id: 'board3', name: 'Board 3' });
			
			const boardsAgain = manager.getAllBoards();
			expect(boardsAgain).toHaveLength(2);
		});
	});

	describe('addBoard', () => {
		it('should add a new board', () => {
			const newBoard: BoardConfig = {
				...DEFAULT_BOARD,
				id: 'board3',
				name: 'Board 3',
				tagFilter: '#tag3'
			};
			
			manager.addBoard(newBoard);
			const boards = manager.getAllBoards();
			expect(boards).toHaveLength(3);
			expect(boards[2].id).toBe('board3');
		});

		it('should throw error for duplicate ID', () => {
			const duplicateBoard: BoardConfig = {
				...DEFAULT_BOARD,
				id: 'board1',
				name: 'Duplicate',
				tagFilter: '#dup'
			};
			
			expect(() => manager.addBoard(duplicateBoard)).toThrow();
		});

		it('should throw error for invalid board name', () => {
			const invalidBoard: BoardConfig = {
				...DEFAULT_BOARD,
				id: 'board3',
				name: '',
				tagFilter: '#tag3'
			};
			
			expect(() => manager.addBoard(invalidBoard)).toThrow();
		});
	});

	describe('updateBoard', () => {
		it('should update board properties', () => {
			const updated = manager.updateBoard('board1', { name: 'Updated Board 1' });
			expect(updated).toBeDefined();
			expect(updated?.name).toBe('Updated Board 1');
		});

		it('should return null for non-existent board', () => {
			const updated = manager.updateBoard('nonexistent', { name: 'Test' });
			expect(updated).toBeNull();
		});
	});

	describe('deleteBoard', () => {
		it('should delete a board', () => {
			const success = manager.deleteBoard('board2');
			expect(success).toBe(true);
			
			const boards = manager.getAllBoards();
			expect(boards).toHaveLength(1);
			expect(boards[0].id).toBe('board1');
		});

		it('should not delete the last board', () => {
			manager.deleteBoard('board2');
			const success = manager.deleteBoard('board1');
			expect(success).toBe(false);
			
			const boards = manager.getAllBoards();
			expect(boards).toHaveLength(1);
		});

		it('should return false for non-existent board', () => {
			const success = manager.deleteBoard('nonexistent');
			expect(success).toBe(false);
		});
	});

	describe('addColumnToBoard', () => {
		it('should add a custom column', () => {
			const success = manager.addColumnToBoard('board1', 'New Column');
			expect(success).toBe(true);
			
			const board = manager.getBoard('board1');
			expect(board?.customColumns).toContain('New Column');
		});

		it('should not add duplicate columns', () => {
			manager.addColumnToBoard('board1', 'Test Column');
			const success = manager.addColumnToBoard('board1', 'Test Column');
			expect(success).toBe(false);
		});

		it('should not add column that exists in default columns', () => {
			const success = manager.addColumnToBoard('board1', 'To Do');
			expect(success).toBe(false);
		});
	});

	describe('removeColumnFromBoard', () => {
		it('should remove a custom column', () => {
			manager.addColumnToBoard('board1', 'Test Column');
			const success = manager.removeColumnFromBoard('board1', 'Test Column');
			expect(success).toBe(true);
			
			const board = manager.getBoard('board1');
			expect(board?.customColumns).not.toContain('Test Column');
		});

		it('should return false for non-existent board', () => {
			const success = manager.removeColumnFromBoard('nonexistent', 'Column');
			expect(success).toBe(false);
		});
	});

	describe('createNewBoard', () => {
		it('should create a board with unique ID', () => {
			const board = manager.createNewBoard('New Board', '#newtag');
			expect(board.id).toBeDefined();
			expect(board.name).toBe('New Board');
			expect(board.tagFilter).toBe('#newtag');
		});

		it('should throw error for invalid name', () => {
			expect(() => manager.createNewBoard('', '#tag')).toThrow();
		});
	});

	describe('duplicateBoard', () => {
		it('should create a copy of an existing board', () => {
			const duplicate = manager.duplicateBoard('board1', 'Board 1 Copy');
			expect(duplicate).toBeDefined();
			expect(duplicate?.id).not.toBe('board1');
			expect(duplicate?.name).toBe('Board 1 Copy');
			expect(duplicate?.tagFilter).toBe('#tag1');
		});

		it('should return null for non-existent board', () => {
			const duplicate = manager.duplicateBoard('nonexistent', 'Copy');
			expect(duplicate).toBeNull();
		});
	});
});
