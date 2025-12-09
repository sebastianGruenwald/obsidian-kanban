import Sortable from 'sortablejs';

export class DragDropManager {
    private draggedFilePath: string | null = null;

    public initColumnSorting(
        container: HTMLElement,
        columns: string[],
        onUpdate: (newOrder: string[]) => Promise<void>
    ): Sortable {
        return new Sortable(container, {
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

                await onUpdate(newOrder);
            }
        });
    }

    public initCardSorting(
        container: HTMLElement,
        columnName: string,
        onCardMove: (filePath: string, newColumn: string) => void | Promise<void>
    ): Sortable {
        return new Sortable(container, {
            group: 'kanban-cards',
            animation: 150,
            ghostClass: 'kanban-card-placeholder',
            delay: 200, // Delay for touch devices to prevent accidental drags
            delayOnTouchOnly: true,
            onStart: (evt) => {
                // Store the file path when drag starts
                const itemEl = evt.item;
                this.draggedFilePath = itemEl.getAttribute('data-file-path');
            },
            onAdd: async (evt) => {
                const itemEl = evt.item;
                let filePath = itemEl.getAttribute('data-file-path');
                
                // If attribute is missing, try to get it from the clone
                if (!filePath && evt.clone) {
                    filePath = evt.clone.getAttribute('data-file-path');
                }
                
                // Fallback to stored value from onStart
                if (!filePath && this.draggedFilePath) {
                    filePath = this.draggedFilePath;
                    // Restore the attribute on the element
                    itemEl.setAttribute('data-file-path', filePath);
                }
                
                if (filePath) {
                    await onCardMove(filePath, columnName);
                }
                
                // Clear the stored path
                this.draggedFilePath = null;
            },
            onEnd: () => {
                // Clear the stored path if drag ends without adding to a new column
                this.draggedFilePath = null;
            }
        });
    }
}
