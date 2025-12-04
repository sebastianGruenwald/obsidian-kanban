import { App, TextComponent, setIcon, Menu } from 'obsidian';
import { BoardConfig, KanbanSettings } from '../types';
import KanbanPlugin from '../main';
import { AddColumnModal } from '../modals';

export class KanbanHeader {
    private tagFilterPopup: HTMLElement | null = null;
    private themePopup: HTMLElement | null = null;
    private propsPopup: HTMLElement | null = null;
    private tagSearchQuery: string = '';

    constructor(
        private app: App,
        private plugin: KanbanPlugin,
        private container: HTMLElement,
        private currentBoard: BoardConfig,
        private settings: KanbanSettings,
        private onRefresh: () => void,
        private onSearch: (query: string) => void,
        private onTagFilter: (tags: Set<string>) => void,
        private getSelectedTags: () => Set<string>,
        private getAllTags: () => string[]
    ) { }

    render(searchQuery: string): void {
        this.container.empty();
        this.createBoardHeader(this.container, searchQuery);
    }

    private createBoardHeader(container: HTMLElement, searchQuery: string): void {
        container.createEl('h2', {
            text: this.currentBoard.name || 'Kanban Board',
            cls: 'kanban-board-title'
        });

        const controls = container.createDiv({ cls: 'kanban-board-controls' });

        // Search input
        const searchContainer = controls.createDiv({ cls: 'kanban-search-container' });
        const searchInput = new TextComponent(searchContainer);
        searchInput.setPlaceholder('Search cards...');
        searchInput.setValue(searchQuery);
        searchInput.onChange((value) => {
            this.onSearch(value);
        });

        // Board selector
        const boardSelect = controls.createEl('select', { cls: 'kanban-board-selector' });
        const boards = this.plugin.boardManager.getAllBoards();
        boards.forEach(board => {
            const option = boardSelect.createEl('option', {
                value: board.id,
                text: board.name
            });
            if (board.id === this.settings.activeBoard) {
                option.selected = true;
            }
        });

        boardSelect.addEventListener('change', async (e) => {
            const target = e.target as HTMLSelectElement;
            this.settings.activeBoard = target.value;
            await this.plugin.saveSettings();
            this.onRefresh();
        });

        // Sort dropdown
        const sortContainer = controls.createDiv({ cls: 'kanban-sort-container' });
        sortContainer.createEl('label', { text: 'Sort:', cls: 'kanban-sort-label' });

        const sortSelect = sortContainer.createEl('select', { cls: 'kanban-sort-selector' });

        // Standard sort options
        const sortOptions = [
            { value: 'none', text: 'No sorting' },
            { value: 'creation', text: 'Created' },
            { value: 'modification', text: 'Modified' },
            { value: 'title', text: 'Title' }
        ];

        // Add visible properties to sort options
        if (this.currentBoard.visibleProperties) {
            this.currentBoard.visibleProperties.forEach(prop => {
                if (!['title', 'created', 'modified', 'tags'].includes(prop)) {
                    sortOptions.push({ value: prop, text: prop });
                }
            });
        }

        sortOptions.forEach(option => {
            const optionEl = sortSelect.createEl('option', {
                value: option.value,
                text: option.text
            });
            if (option.value === this.currentBoard.sortBy) {
                optionEl.selected = true;
            }
        });

        const orderSelect = sortContainer.createEl('select', { cls: 'kanban-sort-order-selector' });
        orderSelect.createEl('option', { value: 'asc', text: '↑' });
        orderSelect.createEl('option', { value: 'desc', text: '↓' });
        orderSelect.value = this.currentBoard.sortOrder || 'asc';

        sortSelect.addEventListener('change', async (e) => {
            const target = e.target as HTMLSelectElement;
            this.plugin.boardManager.updateBoard(this.currentBoard.id, { sortBy: target.value as any });
            await this.plugin.saveSettings();
            this.onRefresh();
        });

        orderSelect.addEventListener('change', async (e) => {
            const target = e.target as HTMLSelectElement;
            this.plugin.boardManager.updateBoard(this.currentBoard.id, { sortOrder: target.value as any });
            await this.plugin.saveSettings();
            this.onRefresh();
        });

        // Add column button
        const addColumnBtn = controls.createEl('button', {
            cls: 'kanban-add-column-btn',
            attr: { title: 'Add new column' }
        });
        setIcon(addColumnBtn, 'plus');
        addColumnBtn.createSpan({ text: ' Column' });

        addColumnBtn.addEventListener('click', () => {
            new AddColumnModal(this.app, this.plugin, this.currentBoard.id, () => {
                this.onRefresh();
            }).open();
        });

        // Refresh button
        const refreshBtn = controls.createEl('button', {
            cls: 'kanban-refresh-btn',
            attr: { title: 'Refresh Board' }
        });
        setIcon(refreshBtn, 'refresh-cw');

        refreshBtn.addEventListener('click', () => this.onRefresh());

        // Filter button
        const selectedTags = this.getSelectedTags();
        const filterBtn = controls.createEl('button', {
            cls: `kanban-filter-btn ${selectedTags.size > 0 ? 'is-active' : ''}`,
            attr: { title: 'Filter Tags' }
        });
        setIcon(filterBtn, 'filter');
        if (selectedTags.size > 0) {
            filterBtn.createSpan({ text: `${selectedTags.size}`, cls: 'kanban-filter-count' });
        }

        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleTagFilter(filterBtn);
        });

        // Theme selector button
        const themeBtn = controls.createEl('button', {
            cls: 'kanban-theme-btn',
            attr: { title: 'Change Board Theme' }
        });
        setIcon(themeBtn, 'palette');

        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.themePopup) {
                this.closeAllPopups();
            } else {
                this.closeAllPopups();
                this.showThemeSelector(themeBtn);
            }
        });

        // Properties toggle button
        const propsBtn = controls.createEl('button', {
            cls: 'kanban-props-btn',
            attr: { title: 'Toggle Visible Properties' }
        });
        setIcon(propsBtn, 'eye');

        propsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.propsPopup) {
                this.closeAllPopups();
            } else {
                this.closeAllPopups();
                this.showPropertiesToggle(propsBtn);
            }
        });
    }

    private closeAllPopups(): void {
        if (this.tagFilterPopup) {
            this.closeTagFilter();
        }
        if (this.themePopup) {
            this.themePopup.remove();
            this.themePopup = null;
        }
        if (this.propsPopup) {
            this.propsPopup.remove();
            this.propsPopup = null;
        }
    }

    private toggleTagFilter(targetBtn: HTMLElement): void {
        if (this.tagFilterPopup) {
            this.closeAllPopups();
            return;
        }

        this.closeAllPopups();
        this.openTagFilter(targetBtn);
    }

    private closeTagFilter(): void {
        if (this.tagFilterPopup) {
            this.tagFilterPopup.remove();
            this.tagFilterPopup = null;
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }

    private handleDocumentClick = (e: MouseEvent) => {
        if (this.tagFilterPopup && !this.tagFilterPopup.contains(e.target as Node)) {
            this.closeTagFilter();
        }
    };

    private openTagFilter(targetBtn: HTMLElement): void {
        const allTags = this.getAllTags();
        if (allTags.length === 0) return;

        this.tagFilterPopup = document.body.createDiv({ cls: 'kanban-tag-filter-popup' });

        // Position the popup
        const rect = targetBtn.getBoundingClientRect();
        this.tagFilterPopup.style.top = `${rect.bottom + 5}px`;
        this.tagFilterPopup.style.left = `${rect.right - 250}px`; // Align right edge roughly

        // Search input
        const searchContainer = this.tagFilterPopup.createDiv({ cls: 'kanban-tag-filter-search' });
        const searchInput = new TextComponent(searchContainer);
        searchInput.setPlaceholder('Search tags...');
        searchInput.setValue(this.tagSearchQuery);
        searchInput.onChange((value) => {
            this.tagSearchQuery = value;
            this.renderTagList(listContainer, allTags);
        });

        // Focus input
        setTimeout(() => searchInput.inputEl.focus(), 0);

        // Tag list
        const listContainer = this.tagFilterPopup.createDiv({ cls: 'kanban-tag-filter-list' });
        this.renderTagList(listContainer, allTags);

        // Close on outside click
        document.addEventListener('click', this.handleDocumentClick);

        // Prevent clicks inside popup from closing it
        this.tagFilterPopup.addEventListener('click', (e) => e.stopPropagation());
    }

    private renderTagList(container: HTMLElement, allTags: string[]): void {
        container.empty();

        const filteredTags = allTags.filter(tag =>
            tag.toLowerCase().includes(this.tagSearchQuery.toLowerCase())
        );

        if (filteredTags.length === 0) {
            container.createDiv({ cls: 'kanban-tag-filter-empty', text: 'No tags found' });
            return;
        }

        const selectedTags = this.getSelectedTags();

        filteredTags.forEach(tag => {
            const item = container.createDiv({ cls: 'kanban-tag-filter-item' });
            const checkbox = item.createEl('input', {
                type: 'checkbox',
                cls: 'kanban-tag-filter-checkbox'
            });
            checkbox.checked = selectedTags.has(tag);

            item.createSpan({ text: tag, cls: 'kanban-tag-filter-label' });

            item.addEventListener('click', () => {
                checkbox.checked = !checkbox.checked;
                if (checkbox.checked) {
                    selectedTags.add(tag);
                } else {
                    selectedTags.delete(tag);
                }
                this.onTagFilter(selectedTags);
                this.render(this.tagSearchQuery); // Update header to reflect count
            });

            // Prevent double toggle when clicking checkbox directly
            checkbox.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedTags.add(tag);
                } else {
                    selectedTags.delete(tag);
                }
                this.onTagFilter(selectedTags);
                this.render(this.tagSearchQuery);
            });
        });
    }

    private showThemeSelector(targetBtn: HTMLElement): void {
        this.themePopup = document.body.createDiv({ cls: 'kanban-theme-popup' });
        const popup = this.themePopup;

        // Position the popup
        const rect = targetBtn.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = `${rect.bottom + 5}px`;
        popup.style.right = `${window.innerWidth - rect.right}px`;

        popup.createEl('div', { text: 'Board Theme', cls: 'kanban-popup-title' });

        const themes = [
            { value: 'default', label: 'Modern (Default)', icon: 'layout-grid' },
            { value: 'sticky-notes', label: 'Sticky Notes', icon: 'sticky-note' }
        ];

        themes.forEach(theme => {
            const item = popup.createDiv({ cls: 'kanban-popup-item' });
            const currentTheme = this.currentBoard.theme || 'default';
            const isActive = currentTheme === theme.value;

            if (isActive) {
                item.addClass('is-active');
            }

            const iconEl = item.createSpan({ cls: 'kanban-popup-item-icon' });
            setIcon(iconEl, theme.icon);
            item.createSpan({ text: theme.label, cls: 'kanban-popup-item-label' });

            item.addEventListener('click', async () => {
                // Update board config
                this.plugin.boardManager.updateBoard(this.currentBoard.id, { theme: theme.value as 'default' | 'sticky-notes' });
                await this.plugin.saveSettings();
                // Apply theme immediately
                document.body.classList.remove('theme-default', 'theme-sticky-notes');
                document.body.classList.add(`theme-${theme.value}`);

                this.closeAllPopups();
            });
        });

        // Close on click outside
        const closePopup = (e: MouseEvent) => {
            if (!popup.contains(e.target as Node) && e.target !== targetBtn) {
                this.closeAllPopups();
                document.removeEventListener('click', closePopup);
            }
        };
        setTimeout(() => document.addEventListener('click', closePopup), 0);
    }

    private showPropertiesToggle(targetBtn: HTMLElement): void {
        this.propsPopup = document.body.createDiv({ cls: 'kanban-props-popup' });
        const popup = this.propsPopup;

        // Position the popup
        const rect = targetBtn.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = `${rect.bottom + 5}px`;
        popup.style.right = `${window.innerWidth - rect.right}px`;

        popup.createEl('div', { text: 'Visible Properties', cls: 'kanban-popup-title' });

        // We need to get all properties from cards, but we don't have access to cards here directly.
        // We can either pass them in or just use standard properties + what's already in visibleProperties.
        // For better UX, we should probably pass a "getAllProperties" callback.
        // For now, let's use a simplified approach or assume the caller handles this?
        // Let's assume we can get custom properties from the board config or just show standard ones + existing visible ones.

        const standardProps = ['title', 'created', 'modified', 'tags'];
        const currentProps = this.currentBoard.visibleProperties;

        // This is a limitation of extracting this component without passing all cards.
        // Ideally we should pass a list of available properties.
        // For now, let's just show standard + currently visible.
        const availableProperties = [
            { key: 'title', label: 'Title' },
            { key: 'created', label: 'Created Date' },
            { key: 'modified', label: 'Modified Date' },
            { key: 'tags', label: 'Tags' },
            ...currentProps
                .filter(p => !standardProps.includes(p))
                .map(p => ({ key: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))
        ];

        availableProperties.forEach(prop => {
            const item = popup.createDiv({ cls: 'kanban-popup-item kanban-popup-checkbox-item' });

            const checkbox = item.createEl('input', {
                type: 'checkbox',
                cls: 'kanban-popup-checkbox'
            });
            checkbox.checked = this.currentBoard.visibleProperties.includes(prop.key);

            item.createSpan({ text: prop.label, cls: 'kanban-popup-item-label' });

            const toggleProperty = async () => {
                const currentProps = this.currentBoard.visibleProperties;
                let newProps: string[];

                if (checkbox.checked) {
                    newProps = currentProps.includes(prop.key)
                        ? currentProps
                        : [...currentProps, prop.key];
                } else {
                    newProps = currentProps.filter(p => p !== prop.key);
                }

                // Remove duplicates
                newProps = [...new Set(newProps)];

                this.plugin.boardManager.updateBoard(this.currentBoard.id, { visibleProperties: newProps });
                await this.plugin.saveSettings();
                this.onRefresh();
            };

            item.addEventListener('click', async () => {
                checkbox.checked = !checkbox.checked;
                await toggleProperty();
            });

            checkbox.addEventListener('click', (e) => e.stopPropagation());
            checkbox.addEventListener('change', toggleProperty);
        });

        // Close on click outside
        const closePopup = (e: MouseEvent) => {
            if (!popup.contains(e.target as Node) && e.target !== targetBtn) {
                this.closeAllPopups();
                document.removeEventListener('click', closePopup);
            }
        };
        setTimeout(() => document.addEventListener('click', closePopup), 0);
    }
}
