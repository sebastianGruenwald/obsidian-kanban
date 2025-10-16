import { BoardConfig, DEFAULT_BOARD } from './types';

export class BoardManager {
	constructor(private boards: BoardConfig[]) {}

	getBoard(boardId: string): BoardConfig | null {
		return this.boards.find(board => board.id === boardId) || null;
	}

	getAllBoards(): BoardConfig[] {
		return [...this.boards];
	}

	addBoard(board: BoardConfig): void {
		this.boards.push(board);
	}

	updateBoard(boardId: string, updates: Partial<BoardConfig>): BoardConfig | null {
		const boardIndex = this.boards.findIndex(board => board.id === boardId);
		if (boardIndex === -1) return null;

		this.boards[boardIndex] = { ...this.boards[boardIndex], ...updates };
		return this.boards[boardIndex];
	}

	deleteBoard(boardId: string): boolean {
		const boardIndex = this.boards.findIndex(board => board.id === boardId);
		if (boardIndex === -1 || this.boards.length <= 1) return false; // Don't delete last board

		this.boards.splice(boardIndex, 1);
		return true;
	}

	addColumnToBoard(boardId: string, columnName: string): boolean {
		const board = this.getBoard(boardId);
		if (!board || board.customColumns.includes(columnName)) return false;

		board.customColumns.push(columnName);
		return true;
	}

	removeColumnFromBoard(boardId: string, columnName: string): boolean {
		const board = this.getBoard(boardId);
		if (!board) return false;

		// Remove from custom columns
		const customIndex = board.customColumns.indexOf(columnName);
		if (customIndex > -1) {
			board.customColumns.splice(customIndex, 1);
		}

		// Remove from column order
		const orderIndex = board.columnOrder.indexOf(columnName);
		if (orderIndex > -1) {
			board.columnOrder.splice(orderIndex, 1);
		}

		return true;
	}

	updateColumnOrder(boardId: string, columnOrder: string[]): boolean {
		const board = this.getBoard(boardId);
		if (!board) return false;

		board.columnOrder = [...columnOrder];
		return true;
	}

	createNewBoard(name: string, tagFilter: string): BoardConfig {
		const id = this.generateBoardId(name);
		return {
			...DEFAULT_BOARD,
			id,
			name,
			tagFilter
		};
	}

	private generateBoardId(name: string): string {
		const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '');
		let id = baseId;
		let counter = 1;

		while (this.boards.some(board => board.id === id)) {
			id = `${baseId}_${counter}`;
			counter++;
		}

		return id;
	}

	getBoardsForTag(tag: string): BoardConfig[] {
		return this.boards.filter(board => board.tagFilter === tag);
	}

	duplicateBoard(boardId: string, newName: string): BoardConfig | null {
		const originalBoard = this.getBoard(boardId);
		if (!originalBoard) return null;

		const newBoard: BoardConfig = {
			...originalBoard,
			id: this.generateBoardId(newName),
			name: newName
		};

		this.addBoard(newBoard);
		return newBoard;
	}
}