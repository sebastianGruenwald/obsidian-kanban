import { ItemView, WorkspaceLeaf, Menu, TFile } from 'obsidian';
import { KanbanCard } from './types';
import { DataManager } from './dataManager';
import KanbanPlugin from './main';

export const VIEW_TYPE_KANBAN = 'kanban-board-view';

export class KanbanView extends ItemView {
	private dataManager: DataManager;
	private cards: KanbanCard[] = [];
	private columns: string[] = [];
	private draggedCard: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: KanbanPlugin) {
		super(leaf);
		this.dataManager = new DataManager(this.app, this.plugin.settings);
	}

	getViewType(): string {
		return VIEW_TYPE_KANBAN;
	}

	getDisplayText(): string {
		return 'Kanban Board';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		this.cards = await this.dataManager.getKanbanCards();
		this.columns = this.dataManager.getColumns(this.cards);
		this.render();
	}

	private render(): void {
		const container = this.containerEl.children[1];
		container.empty();
		
		const kanbanContainer = container.createDiv({ cls: 'kanban-board' });
		
		// Create columns
		for (const columnName of this.columns) {
			const columnCards = this.cards.filter(card => card.column === columnName);
			this.createColumn(kanbanContainer, columnName, columnCards);
		}
		
		this.addStyles();
	}

	private createColumn(container: HTMLElement, columnName: string, cards: KanbanCard[]): void {
		const column = container.createDiv({ cls: 'kanban-column' });
		
		// Column header
		const header = column.createDiv({ cls: 'kanban-column-header' });
		const title = header.createSpan({ text: columnName });
		
		if (this.plugin.settings.showFileCount) {
			const count = header.createSpan({ 
				cls: 'kanban-column-count',
				text: ` (${cards.length})`
			});
		}
		
		// Column content
		const content = column.createDiv({ cls: 'kanban-column-content' });
		
		// Make column droppable
		this.makeDroppable(content, columnName);
		
		// Add cards
		for (const card of cards) {
			this.createCard(content, card);
		}
	}

	private createCard(container: HTMLElement, card: KanbanCard): void {
		const cardEl = container.createDiv({ cls: 'kanban-card' });
		cardEl.setAttribute('data-file-path', card.file);
		
		// Make card draggable
		cardEl.draggable = true;
		cardEl.addEventListener('dragstart', (e) => {
			this.draggedCard = cardEl;
			cardEl.addClass('dragging');
			e.dataTransfer?.setData('text/plain', card.file);
		});
		
		cardEl.addEventListener('dragend', () => {
			cardEl.removeClass('dragging');
			this.draggedCard = null;
		});
		
		// Card title
		const title = cardEl.createDiv({ cls: 'kanban-card-title', text: card.title });
		
		// Click to open file
		cardEl.addEventListener('click', () => {
			this.openFile(card.file);
		});
		
		// Right-click context menu
		cardEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showCardContextMenu(e, card);
		});
		
		// Show creation/modification dates if available
		if (card.created || card.modified) {
			const meta = cardEl.createDiv({ cls: 'kanban-card-meta' });
			if (card.created) {
				meta.createSpan({ 
					cls: 'kanban-card-date',
					text: `Created: ${new Date(card.created).toLocaleDateString()}`
				});
			}
		}
	}

	private makeDroppable(element: HTMLElement, columnName: string): void {
		element.addEventListener('dragover', (e) => {
			e.preventDefault();
			element.addClass('drag-over');
		});
		
		element.addEventListener('dragleave', () => {
			element.removeClass('drag-over');
		});
		
		element.addEventListener('drop', async (e) => {
			e.preventDefault();
			element.removeClass('drag-over');
			
			const filePath = e.dataTransfer?.getData('text/plain');
			if (filePath && this.draggedCard) {
				await this.moveCard(filePath, columnName);
			}
		});
	}

	private async moveCard(filePath: string, newColumn: string): Promise<void> {
		try {
			await this.dataManager.updateCardColumn(filePath, newColumn);
			await this.refresh(); // Refresh to show the updated position
		} catch (error) {
			console.error('Failed to move card:', error);
		}
	}

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}

	private showCardContextMenu(event: MouseEvent, card: KanbanCard): void {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle('Open')
				.setIcon('file-text')
				.onClick(() => this.openFile(card.file));
		});
		
		menu.addItem((item) => {
			item.setTitle('Open in new tab')
				.setIcon('file-plus')
				.onClick(() => {
					const file = this.app.vault.getAbstractFileByPath(card.file);
					if (file instanceof TFile) {
						this.app.workspace.getLeaf('tab').openFile(file);
					}
				});
		});
		
		menu.addSeparator();
		
		// Add move options for each column
		for (const column of this.columns) {
			if (column !== card.column) {
				menu.addItem((item) => {
					item.setTitle(`Move to "${column}"`)
						.setIcon('arrow-right')
						.onClick(() => this.moveCard(card.file, column));
				});
			}
		}
		
		menu.showAtMouseEvent(event);
	}

	private addStyles(): void {
		// Add CSS styles if they don't exist
		if (!document.getElementById('kanban-board-styles')) {
			const style = document.createElement('style');
			style.id = 'kanban-board-styles';
			style.textContent = `
				.kanban-board {
					display: flex;
					gap: 16px;
					padding: 16px;
					overflow-x: auto;
					height: 100%;
				}
				
				.kanban-column {
					min-width: 280px;
					background: var(--background-secondary);
					border-radius: 8px;
					flex-shrink: 0;
				}
				
				.kanban-column-header {
					padding: 12px 16px;
					border-bottom: 1px solid var(--background-modifier-border);
					font-weight: 600;
					display: flex;
					align-items: center;
					justify-content: space-between;
				}
				
				.kanban-column-count {
					color: var(--text-muted);
					font-size: 0.9em;
				}
				
				.kanban-column-content {
					padding: 8px;
					min-height: 200px;
				}
				
				.kanban-column-content.drag-over {
					background: var(--background-modifier-hover);
				}
				
				.kanban-card {
					background: var(--background-primary);
					border: 1px solid var(--background-modifier-border);
					border-radius: 6px;
					padding: 12px;
					margin-bottom: 8px;
					cursor: pointer;
					transition: all 0.2s ease;
				}
				
				.kanban-card:hover {
					border-color: var(--interactive-accent);
					box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
				}
				
				.kanban-card.dragging {
					opacity: 0.5;
					transform: rotate(5deg);
				}
				
				.kanban-card-title {
					font-weight: 500;
					margin-bottom: 8px;
					word-wrap: break-word;
				}
				
				.kanban-card-meta {
					font-size: 0.8em;
					color: var(--text-muted);
				}
				
				.kanban-card-date {
					display: block;
				}
			`;
			document.head.appendChild(style);
		}
	}
}