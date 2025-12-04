import { showError } from './utils';

export type ErrorContext = 
	| 'card-creation'
	| 'card-update'
	| 'card-move'
	| 'card-archive'
	| 'board-creation'
	| 'board-update'
	| 'settings-load'
	| 'settings-save'
	| 'file-operation'
	| 'data-fetch'
	| 'render'
	| 'unknown';

export interface ErrorOptions {
	showToUser?: boolean;
	context: ErrorContext;
	action?: string;
	metadata?: Record<string, unknown>;
}

export class ErrorHandler {
	private static instance: ErrorHandler;
	private errorLog: Array<{ timestamp: number; context: string; error: Error }> = [];
	private readonly MAX_LOG_SIZE = 100;

	private constructor() {}

	static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * Handle an error with proper logging and user notification
	 */
	handle(error: unknown, options: ErrorOptions): void {
		const err = this.normalizeError(error);
		const { showToUser = true, context, action, metadata } = options;

		// Log to console with context
		console.error(
			`[Kanban][${context}]${action ? ` ${action}` : ''}:`,
			err.message,
			metadata ? { metadata } : ''
		);

		// Add to error log
		this.addToLog(context, err);

		// Show to user if requested
		if (showToUser) {
			const userMessage = this.getUserMessage(context, action, err);
			showError(userMessage);
		}
	}

	/**
	 * Handle an error and re-throw it
	 */
	handleAndThrow(error: unknown, options: Omit<ErrorOptions, 'showToUser'>): never {
		this.handle(error, { ...options, showToUser: true });
		throw this.normalizeError(error);
	}

	/**
	 * Wrap an async function with error handling
	 */
	wrap<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		options: Omit<ErrorOptions, 'showToUser'>
	): T {
		return (async (...args: Parameters<T>) => {
			try {
				return await fn(...args);
			} catch (error) {
				this.handle(error, { ...options, showToUser: true });
				throw error;
			}
		}) as T;
	}

	/**
	 * Get recent errors for debugging
	 */
	getRecentErrors(count = 10): Array<{ timestamp: number; context: string; error: Error }> {
		return this.errorLog.slice(-count);
	}

	/**
	 * Clear error log
	 */
	clearLog(): void {
		this.errorLog = [];
	}

	private normalizeError(error: unknown): Error {
		if (error instanceof Error) {
			return error;
		}
		if (typeof error === 'string') {
			return new Error(error);
		}
		return new Error('Unknown error occurred');
	}

	private addToLog(context: string, error: Error): void {
		this.errorLog.push({
			timestamp: Date.now(),
			context,
			error,
		});

		// Trim log if too large
		if (this.errorLog.length > this.MAX_LOG_SIZE) {
			this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE);
		}
	}

	private getUserMessage(context: ErrorContext, action: string | undefined, error: Error): string {
		const contextMessages: Record<ErrorContext, string> = {
			'card-creation': 'Failed to create card',
			'card-update': 'Failed to update card',
			'card-move': 'Failed to move card',
			'card-archive': 'Failed to archive card',
			'board-creation': 'Failed to create board',
			'board-update': 'Failed to update board',
			'settings-load': 'Failed to load settings',
			'settings-save': 'Failed to save settings',
			'file-operation': 'File operation failed',
			'data-fetch': 'Failed to load kanban data',
			'render': 'Failed to render view',
			'unknown': 'An error occurred',
		};

		const baseMessage = contextMessages[context] || contextMessages.unknown;
		const actionPart = action ? ` (${action})` : '';
		const errorPart = error.message ? `: ${error.message}` : '';

		return `${baseMessage}${actionPart}${errorPart}`;
	}
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
