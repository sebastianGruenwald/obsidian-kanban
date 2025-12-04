import { App, Menu, TFile, Notice } from 'obsidian';
import { KanbanCard } from '../types';
import { ColorPickerModal, ConfirmModal } from '../modals';

export class CardContextMenu {
    constructor(
        private app: App,
        private card: KanbanCard,
        private element: HTMLElement,
        private allColumns: string[],
        private onMove: (filePath: string, newColumn: string) => void,
        private onArchive: (card: KanbanCard) => void,
        private onTitleEdit: () => void,
        private onColorChange: (newColor: string) => void
    ) { }

    show(event: MouseEvent): void {
        const menu = new Menu();

        menu.addItem((item) => {
            item.setTitle('Open')
                .setIcon('file-text')
                .onClick(() => this.openFile(this.card.file));
        });

        menu.addItem((item) => {
            item.setTitle('Open in new tab')
                .setIcon('file-plus')
                .onClick(() => {
                    const file = this.app.vault.getAbstractFileByPath(this.card.file);
                    if (file instanceof TFile) {
                        this.app.workspace.getLeaf('tab').openFile(file);
                    }
                });
        });

        menu.addItem((item) => {
            item.setTitle('Edit title')
                .setIcon('pencil')
                .onClick(() => this.onTitleEdit());
        });

        menu.addItem((item) => {
            item.setTitle('Change color')
                .setIcon('palette')
                .onClick(() => {
                    new ColorPickerModal(
                        this.app,
                        this.card.file,
                        this.card.frontmatter?.cardColor,
                        (newColor) => this.onColorChange(newColor)
                    ).open();
                });
        });

        menu.addSeparator();

        // Add move options for each column
        for (const column of this.allColumns) {
            if (column !== this.card.column) {
                menu.addItem((item) => {
                    item.setTitle(`Move to "${column}"`)
                        .setIcon('arrow-right')
                        .onClick(() => this.onMove(this.card.file, column));
                });
            }
        }

        menu.addSeparator();

        menu.addItem((item) => {
            item.setTitle('Delete Card')
                .setIcon('trash-2')
                .onClick(async () => {
                    const file = this.app.vault.getAbstractFileByPath(this.card.file);
                    if (file instanceof TFile) {
                        // Confirm deletion
                        const confirmed = await new Promise<boolean>((resolve) => {
                            const modal = new ConfirmModal(
                                this.app,
                                'Delete Card',
                                `Are you sure you want to delete "${this.card.title}"? This will permanently delete the file.`,
                                'Delete',
                                () => resolve(true),
                                () => resolve(false)
                            );
                            modal.open();
                        });

                        if (confirmed) {
                            try {
                                await this.app.vault.delete(file);
                                // No need to refresh manually - file watcher will handle it
                            } catch (error) {
                                console.error('Failed to delete file:', error);
                                new Notice('Failed to delete file');
                            }
                        }
                    }
                });
        });

        menu.addItem((item) => {
            item.setTitle('Archive Card')
                .setIcon('archive')
                .onClick(() => this.onArchive(this.card));
        });

        menu.showAtMouseEvent(event);
    }

    private openFile(filePath: string): void {
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            this.app.workspace.getLeaf().openFile(file);
        }
    }
}
