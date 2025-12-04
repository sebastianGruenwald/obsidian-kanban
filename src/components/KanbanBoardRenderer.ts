import { App, TFile } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import KanbanPlugin from '../main';
import { DataManager } from '../dataManager';
import { KanbanColumnComponent } from './KanbanColumnComponent';
import Sortable from 'sortablejs';

export class KanbanBoardRenderer {
    constructor(
        private app: App,
        private plugin: KanbanPlugin,
        private dataManager: DataManager,
        private container: HTMLElement,
        private onRefresh: () => void,
        private onMoveCard: (filePath: string, newColumn: string) => Promise<void>,
        private onArchiveCard: (card: KanbanCard) => Promise<void>,
        private onMoveCardToSwimlane: (filePath: string, newColumn: string, swimlaneProp: string, swimlaneValue: string) => Promise<void>,
        private onUpdateColumns: (newOrder: string[]) => Promise<void>
    ) { }

    render(
        board: BoardConfig,
        cards: KanbanCard[],
        columns: string[],
        searchQuery: string,
        selectedTags: Set<string>
    ): void {
        this.container.empty();

        if (!board) {
            this.container.createDiv({
                text: 'No board selected',
                cls: 'kanban-error'
            });
            return;
        }

        // Column backgrounds setting
        if (board.showColumnBackgrounds) {
            this.container.addClass('distinct-columns');
        } else {
            this.container.removeClass('distinct-columns');
        }

        if (board.colorfulHeaders !== false) {
            this.container.addClass('colorful-headers');
        } else {
            this.container.removeClass('colorful-headers');
        }

        // Initialize Sortable for Columns
        if (!board.swimlaneProperty) {
            new Sortable(this.container, {
                animation: 150,
                handle: '.kanban-column-header',
                ghostClass: 'kanban-column-placeholder',
                delay: 200,
                delayOnTouchOnly: true,
                onEnd: async (evt) => {
                    if (evt.oldIndex === undefined || evt.newIndex === undefined || evt.oldIndex === evt.newIndex) return;

                    const newOrder = [...columns];
                    const movedColumn = newOrder.splice(evt.oldIndex, 1)[0];
                    newOrder.splice(evt.newIndex, 0, movedColumn);

                    await this.onUpdateColumns(newOrder);
                }
            });
        }

        // Filter cards
        const filteredCards = this.filterCards(cards, searchQuery, selectedTags);

        if (board.swimlaneProperty) {
            this.renderSwimlanes(board, filteredCards, columns);
        } else {
            this.renderColumns(board, filteredCards, columns);
        }
    }

    private filterCards(cards: KanbanCard[], searchQuery: string, selectedTags: Set<string>): KanbanCard[] {
        return cards.filter(card => {
            const matchesSearch = !searchQuery ||
                card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (card.content && card.content.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (selectedTags.size === 0) return true;

            const cardTags = card.frontmatter.tags
                ? (Array.isArray(card.frontmatter.tags) ? card.frontmatter.tags : [card.frontmatter.tags])
                : [];

            const cleanCardTags = cardTags.map((t: string) => t.replace('#', ''));
            return cleanCardTags.some((t: string) => selectedTags.has(t));
        });
    }

    private renderColumns(board: BoardConfig, cards: KanbanCard[], columns: string[]): void {
        for (const columnName of columns) {
            const columnCards = cards.filter(card => card.column === columnName);

            new KanbanColumnComponent(
                this.app,
                this.plugin,
                this.dataManager,
                board,
                this.container,
                columnName,
                columnCards,
                columns,
                {
                    onCardMove: (filePath, newColumn) => this.onMoveCard(filePath, newColumn),
                    onCardArchive: (card) => this.onArchiveCard(card),
                    onColumnRename: () => this.onRefresh(),
                    onColumnDelete: async () => {
                        this.plugin.boardManager.removeColumnFromBoard(board.id, columnName);
                        await this.plugin.saveSettings();
                        this.onRefresh();
                    },
                    onColumnReorder: () => { },
                    onColumnResize: async (width) => {
                        const columnWidths = board.columnWidths || {};
                        columnWidths[columnName] = width;
                        this.plugin.boardManager.updateBoard(board.id, { columnWidths });
                        await this.plugin.saveSettings();
                    },
                    onNewCard: () => this.onRefresh(),
                    onDragStart: () => { },
                    onDragEnd: () => { },
                    getDraggedCard: () => null,
                    getPlaceholder: () => null,
                    setPlaceholder: () => { }
                }
            );
        }
    }

    private renderSwimlanes(board: BoardConfig, cards: KanbanCard[], columns: string[]): void {
        this.container.empty();
        this.container.addClass('has-swimlanes');
        const swimlaneProp = board.swimlaneProperty!;

        // Get unique swimlane values
        const swimlaneValues = new Set<string>();
        cards.forEach(card => {
            const val = card.frontmatter[swimlaneProp] || 'Unassigned';
            swimlaneValues.add(String(val));
        });

        const sortedSwimlanes = Array.from(swimlaneValues).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });

        // Render Column Headers Row
        const headerRow = this.container.createDiv({ cls: 'kanban-swimlane-header-row' });
        headerRow.createDiv({ cls: 'kanban-swimlane-corner' });

        columns.forEach(colName => {
            const colHeader = headerRow.createDiv({ cls: 'kanban-column-header' });
            colHeader.createSpan({ text: colName, cls: 'kanban-column-title' });
        });

        // Render Swimlane Rows
        for (const swimlane of sortedSwimlanes) {
            const row = this.container.createDiv({ cls: 'kanban-swimlane-row' });

            // Swimlane Header
            const swimlaneHeader = row.createDiv({ cls: 'kanban-swimlane-header' });
            swimlaneHeader.createSpan({ text: swimlane });

            // Columns within Swimlane
            for (const columnName of columns) {
                const cell = row.createDiv({ cls: 'kanban-swimlane-cell' });

                const cellCards = cards.filter(card => {
                    const cardSwimlaneVal = String(card.frontmatter[swimlaneProp] || 'Unassigned');
                    return card.column === columnName && cardSwimlaneVal === swimlane;
                });

                new KanbanColumnComponent(
                    this.app,
                    this.plugin,
                    this.dataManager,
                    board,
                    cell,
                    columnName,
                    cellCards,
                    columns,
                    {
                        onCardMove: async (filePath, newColumn) => {
                            await this.onMoveCardToSwimlane(filePath, newColumn, swimlaneProp, swimlane);
                        },
                        onCardArchive: (card) => this.onArchiveCard(card),
                        onColumnRename: () => this.onRefresh(),
                        onColumnDelete: async () => {
                            this.plugin.boardManager.removeColumnFromBoard(board.id, columnName);
                            await this.plugin.saveSettings();
                            this.onRefresh();
                        },
                        onColumnReorder: () => { },
                        onColumnResize: () => { },
                        onNewCard: () => this.onRefresh(),
                        onDragStart: () => { },
                        onDragEnd: () => { },
                        getDraggedCard: () => null,
                        getPlaceholder: () => null,
                        setPlaceholder: () => { }
                    }
                );

                cell.querySelector('.kanban-column')?.addClass('is-swimlane-cell');
            }
        }
    }
}
