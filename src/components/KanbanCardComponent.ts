import { App, Menu, TFile, setIcon } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import { DataManager } from '../dataManager';
import { ColorPickerModal } from '../modals';

export class KanbanCardComponent {
	private element: HTMLElement;
	private isEditing: boolean = false;

	constructor(
		private app: App,
		private card: KanbanCard,
		private boardConfig: BoardConfig,
		private container: HTMLElement,
		private allColumns: string[],
		private onMove: (filePath: string, newColumn: string) => void,
		private onDragStart: (e: DragEvent, card: KanbanCard, element: HTMLElement) => void,
		private onDragEnd: () => void,
		private onArchive: (card: KanbanCard) => void,
		private dataManager?: DataManager,
		private onTitleChange?: () => void,
		private showCardColors: boolean = true
	) {
		this.element = this.render();
	}

	private render(): HTMLElement {
		const cardEl = this.container.createDiv({ cls: 'kanban-card' });

		// Apply density class
		if (this.boardConfig.cardDensity) {
			cardEl.addClass(`density-${this.boardConfig.cardDensity}`);
		} else {
			cardEl.addClass('density-comfortable');
		}

		// Apply card color from frontmatter (only if showCardColors is enabled)
		if (this.showCardColors) {
			const cardColor = this.card.frontmatter?.cardColor;
			if (cardColor && cardColor !== 'none') {
				cardEl.setAttribute('data-card-color', cardColor);
			}
			// Cards without cardColor or with 'none' will use default styling
		}

		cardEl.setAttribute('data-file-path', this.card.file);

		// Make card draggable
		cardEl.draggable = true;
		cardEl.addEventListener('dragstart', (e) => {
			this.onDragStart(e, this.card, cardEl);
		});

		cardEl.addEventListener('dragend', () => {
			this.onDragEnd();
		});

		// Card content based on visible properties
		this.renderCardContent(cardEl);

		// Card Aging
		this.applyCardAging(cardEl);

		// Click to open file
		cardEl.addEventListener('click', (e) => {
			// Don't open file if we're editing
			if (!this.isEditing) {
				this.openFile(this.card.file);
			}
		});

		// Double-click to edit title
		cardEl.addEventListener('dblclick', (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.startTitleEdit(cardEl);
		});

		// Right-click context menu
		cardEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showCardContextMenu(e);
		});

		// Mobile Options Button
		const optionsBtn = cardEl.createEl('button', {
			cls: 'kanban-card-options-btn',
			attr: { 'aria-label': 'Card options' }
		});
		setIcon(optionsBtn, 'more-vertical');

		optionsBtn.addEventListener('click', (e) => {
			e.stopPropagation(); // Prevent card click
			this.showCardContextMenu(e);
		});

		return cardEl;
	}

	private renderCardContent(cardEl: HTMLElement): void {
		const visibleProperties = this.boardConfig.visibleProperties;

		// Always show title
		if (visibleProperties.includes('title')) {
			cardEl.createDiv({ cls: 'kanban-card-title', text: this.card.title });
		}

		// Container for tags and properties
		const body = cardEl.createDiv({ cls: 'kanban-card-body' });

		if (visibleProperties.includes('tags') && this.card.frontmatter.tags) {
			const tags = Array.isArray(this.card.frontmatter.tags) ? this.card.frontmatter.tags : [this.card.frontmatter.tags];

			// Filter out the board tag
			const boardTag = this.boardConfig.tagFilter?.replace('#', '');
			const displayTags = tags.filter((t: string) => t.replace('#', '') !== boardTag);

			if (displayTags.length > 0) {
				const tagsContainer = body.createDiv({ cls: 'kanban-card-tags-container' });
				displayTags.forEach((tag: string) => {
					const cleanTag = tag.replace('#', '');
					const tagEl = tagsContainer.createSpan({ cls: 'kanban-card-tag', text: cleanTag });

					// Apply tag color
					const color = this.getTagColor(cleanTag);
					if (color) {
						tagEl.style.backgroundColor = color;
						tagEl.style.color = '#ffffff'; // Assuming dark colors for now
						tagEl.style.borderColor = color;
					}
				});
			}
		}

		// Show custom frontmatter properties
		visibleProperties.forEach(prop => {
			if (!['title', 'created', 'modified', 'tags'].includes(prop) && this.card.frontmatter[prop]) {
				const propEl = body.createDiv({ cls: 'kanban-card-property' });
				propEl.createSpan({ cls: 'kanban-card-property-key', text: prop });
				propEl.createSpan({ cls: 'kanban-card-property-value', text: String(this.card.frontmatter[prop]) });
			}
		});

		// Footer for dates
		const footer = cardEl.createDiv({ cls: 'kanban-card-footer' });

		if (visibleProperties.includes('created') && this.card.created) {
			const dateEl = footer.createSpan({ cls: 'kanban-card-date' });
			dateEl.setAttribute('aria-label', 'Created');
			dateEl.setText(new Date(this.card.created).toLocaleDateString());
		}

		if (visibleProperties.includes('modified') && this.card.modified) {
			const dateEl = footer.createSpan({ cls: 'kanban-card-date' });
			dateEl.setAttribute('aria-label', 'Modified');
			dateEl.setText(new Date(this.card.modified).toLocaleDateString());
		}

		// Subtask Progress
		this.renderSubtaskProgress(footer);
	}

	private getTagColor(tag: string): string {
		// Check configured colors
		if (this.boardConfig.tagColors && this.boardConfig.tagColors[tag]) {
			return this.boardConfig.tagColors[tag];
		}

		// Generate deterministic color
		let hash = 0;
		for (let i = 0; i < tag.length; i++) {
			hash = tag.charCodeAt(i) + ((hash << 5) - hash);
		}

		// HSL color generation for nice pastel/vibrant colors
		const h = Math.abs(hash) % 360;
		return `hsl(${h}, 70%, 45%)`; // 45% lightness for good contrast with white text
	}

	private openFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}

	private showCardContextMenu(event: MouseEvent): void {
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
				.onClick(() => this.startTitleEdit(this.element));
		});

		menu.addItem((item) => {
			item.setTitle('Change color')
				.setIcon('palette')
				.onClick(() => {
					new ColorPickerModal(
						this.app,
						this.card.file,
						this.card.frontmatter?.cardColor,
						(newColor) => {
							// Update the card's visual appearance
							if (newColor === 'none') {
								this.element.removeAttribute('data-card-color');
							} else {
								this.element.setAttribute('data-card-color', newColor);
							}
						}
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
			item.setTitle('Archive Card')
				.setIcon('archive')
				.onClick(() => this.onArchive(this.card));
		});

		menu.showAtMouseEvent(event);
	}

	private startTitleEdit(cardEl: HTMLElement): void {
		if (this.isEditing || !this.dataManager) return;
		this.isEditing = true;

		const titleEl = cardEl.querySelector('.kanban-card-title') as HTMLElement;
		if (!titleEl) {
			this.isEditing = false;
			return;
		}

		const currentTitle = this.card.title;
		const originalHtml = titleEl.innerHTML;

		// Replace title with input
		titleEl.empty();
		const inputEl = titleEl.createEl('input', {
			cls: 'kanban-card-title-input',
			attr: {
				type: 'text',
				value: currentTitle
			}
		});

		// Prevent click from bubbling (opening file)
		inputEl.addEventListener('click', (e) => e.stopPropagation());

		setTimeout(() => {
			inputEl.focus();
			inputEl.select();
		}, 0);

		const finishEdit = async (save: boolean) => {
			if (!this.isEditing) return;
			this.isEditing = false;

			const newTitle = inputEl.value.trim();

			if (save && newTitle && newTitle !== currentTitle && this.dataManager) {
				try {
					await this.dataManager.updateCardTitle(this.card.file, newTitle);
					if (this.onTitleChange) {
						this.onTitleChange();
					}
				} catch (error) {
					// Restore original on error
					titleEl.innerHTML = originalHtml;
				}
			} else {
				titleEl.innerHTML = originalHtml;
			}
		};

		inputEl.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				await finishEdit(true);
			} else if (e.key === 'Escape') {
				await finishEdit(false);
			}
		});

		inputEl.addEventListener('blur', async () => {
			setTimeout(() => finishEdit(true), 100);
		});
	}

	private renderSubtaskProgress(container: HTMLElement): void {
		const content = this.card.content;
		const total = (content.match(/- \[[ x]\]/g) || []).length;
		if (total === 0) return;

		const completed = (content.match(/- \[x\]/g) || []).length;
		const percentage = Math.round((completed / total) * 100);

		const progressContainer = container.createDiv({ cls: 'kanban-subtask-progress' });
		progressContainer.setAttribute('title', `${completed}/${total} subtasks completed`);

		// Icon
		setIcon(progressContainer.createSpan({ cls: 'kanban-subtask-icon' }), 'check-square');

		// Text
		progressContainer.createSpan({
			cls: 'kanban-subtask-count',
			text: `${completed}/${total}`
		});

		// Optional: Mini progress bar
		// const bar = progressContainer.createDiv({ cls: 'kanban-subtask-bar' });
		// bar.createDiv({ 
		// 	cls: 'kanban-subtask-bar-fill',
		// 	attr: { style: `width: ${percentage}%` }
		// });
	}

	private applyCardAging(cardEl: HTMLElement): void {
		if (!this.boardConfig.cardAging || !this.card.modified) return;

		const now = Date.now();
		const modified = this.card.modified;
		const daysSinceModified = (now - modified) / (1000 * 60 * 60 * 24);
		const threshold = this.boardConfig.cardAgingThreshold || 7;

		if (daysSinceModified > threshold) {
			cardEl.addClass('is-aged');

			// Calculate opacity based on how far past the threshold it is
			// Max aging effect after 2x threshold
			const extraDays = daysSinceModified - threshold;
			const maxExtraDays = threshold; // Cap at another threshold period
			const agingFactor = Math.min(extraDays / maxExtraDays, 1);

			// Opacity goes from 1.0 down to 0.6
			const opacity = 1.0 - (agingFactor * 0.4);
			cardEl.style.setProperty('--aging-opacity', opacity.toString());
		}
	}
}
