import { App, Menu, TFile, setIcon, Notice } from 'obsidian';
import { KanbanCard, BoardConfig } from '../types';
import { DataManager } from '../dataManager';
import { ColorPickerModal, ConfirmModal } from '../modals';

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

		// Render image if any image property is visible
		this.renderCardImage(cardEl);

		// Always show title
		if (visibleProperties.includes('title')) {
			cardEl.createDiv({ cls: 'kanban-card-title', text: this.card.title });
		}

		// Container for tags and properties
		const body = cardEl.createDiv({ cls: 'kanban-card-body' });

		// Footer for dates and progress
		const footer = cardEl.createDiv({ cls: 'kanban-card-footer' });

		this.renderProperties(body, footer);
	}

	private renderProperties(body: HTMLElement, footer?: HTMLElement): void {
		const visibleProperties = this.boardConfig.visibleProperties;

		if (visibleProperties.includes('tags')) {
			const tags = this.card.frontmatter.tags
				? (Array.isArray(this.card.frontmatter.tags) ? this.card.frontmatter.tags : [this.card.frontmatter.tags])
				: [];

			// Filter out the board tag
			const boardTag = this.boardConfig.tagFilter?.replace('#', '');
			const displayTags = tags.filter((t: string) => t.replace('#', '') !== boardTag);

			const tagsContainer = body.createDiv({ cls: 'kanban-card-tags-container' });

			if (displayTags.length > 0) {
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

					// Add remove button
					const removeBtn = tagEl.createSpan({ cls: 'kanban-tag-remove', text: '×' });
					removeBtn.addEventListener('click', async (e) => {
						e.stopPropagation();
						await this.removeTag(cleanTag);
					});
				});
			}

			// Add "+ tag" button
			const addTagBtn = tagsContainer.createSpan({ cls: 'kanban-card-tag kanban-tag-add', text: '+ tag' });
			addTagBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showAddTagInput(tagsContainer, addTagBtn);
			});
		}

		// Show custom frontmatter properties (excluding images)
		const imageProps = this.boardConfig.imageProperties || [];
		visibleProperties.forEach(prop => {
			if (!['title', 'created', 'modified', 'tags'].includes(prop)
				&& !imageProps.includes(prop)
				&& this.card.frontmatter[prop]) {
				const propEl = body.createDiv({ cls: 'kanban-card-property' });
				propEl.createSpan({ cls: 'kanban-card-property-key', text: prop });
				propEl.createSpan({ cls: 'kanban-card-property-value', text: String(this.card.frontmatter[prop]) });
			}
		});

		// Footer for dates (only if footer element is provided)
		if (footer) {
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
	}

	private renderCardImage(cardEl: HTMLElement): void {
		const imageProps = this.boardConfig.imageProperties;

		if (!imageProps || imageProps.length === 0) {
			return;
		}

		const visibleProperties = this.boardConfig.visibleProperties;

		// Find the first visible image property that has a value
		let imageUrl: string | null = null;
		let imageProp: string | null = null;

		for (const prop of imageProps) {
			if (visibleProperties.includes(prop) && this.card.frontmatter[prop]) {
				const value = this.card.frontmatter[prop];
				if (typeof value === 'string' && value.trim()) {
					imageUrl = value;
					imageProp = prop;
					break;
				}
			}
		}

		if (!imageUrl) return;

		// Resolve image path
		const resolvedUrl = this.resolveImagePath(imageUrl);
		if (!resolvedUrl) {
			console.warn('Failed to resolve image path:', imageUrl);
			return;
		}

		const displayMode = this.boardConfig.imageDisplayMode || 'cover';

		if (displayMode === 'cover') {
			const coverEl = cardEl.createDiv({ cls: 'kanban-card-cover' });
			coverEl.style.backgroundImage = `url("${resolvedUrl}")`;
		} else {
			const thumbnailEl = cardEl.createDiv({ cls: 'kanban-card-thumbnail-container' });
			const imgEl = thumbnailEl.createEl('img', { cls: 'kanban-card-thumbnail' });
			imgEl.src = resolvedUrl;
			imgEl.alt = imageProp || 'Card image';
		}
	}

	private resolveImagePath(imagePath: string): string | null {
		// Handle external URLs
		if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
			return imagePath;
		}

		// Handle obsidian links [[...]]
		const wikiLinkMatch = imagePath.match(/\[\[([^\]]+)\]\]/);
		if (wikiLinkMatch) {
			imagePath = wikiLinkMatch[1];
		}

		// Remove any alias from wiki link
		const pipeIndex = imagePath.indexOf('|');
		if (pipeIndex !== -1) {
			imagePath = imagePath.substring(0, pipeIndex);
		}

		// Try to find the file in the vault
		const file = this.app.metadataCache.getFirstLinkpathDest(imagePath, this.card.file);
		if (file) {
			return this.app.vault.getResourcePath(file);
		}

		// If it's a relative path, try to resolve it
		if (imagePath.startsWith('./') || imagePath.startsWith('../') || !imagePath.startsWith('/')) {
			const cardFile = this.app.vault.getAbstractFileByPath(this.card.file);
			if (cardFile) {
				const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(imagePath, this.card.file);
				if (resolvedFile) {
					return this.app.vault.getResourcePath(resolvedFile);
				}
			}
		}

		return null;
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

	private startTitleEdit(cardEl: HTMLElement): void {
		if (this.isEditing || !this.dataManager) return;
		this.isEditing = true;

		const titleEl = cardEl.querySelector('.kanban-card-title') as HTMLElement;
		if (!titleEl) {
			this.isEditing = false;
			return;
		}

		const currentTitle = this.card.title;
		const originalText = titleEl.textContent || '';

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
					titleEl.textContent = originalText;
				}
			} else {
				titleEl.textContent = originalText;
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
		const file = this.app.vault.getAbstractFileByPath(this.card.file);
		if (!(file instanceof TFile)) return;

		const cache = this.app.metadataCache.getFileCache(file);
		const listItems = cache?.listItems;

		if (!listItems || listItems.length === 0) return;

		// Filter for task items
		const tasks = listItems.filter(item => item.task !== undefined);
		if (tasks.length === 0) return;

		const total = tasks.length;
		const completed = tasks.filter(task => task.task === 'x' || task.task === 'X').length;
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

	private async removeTag(tagToRemove: string): Promise<void> {
		if (!this.dataManager) return;

		try {
			const tags = this.card.frontmatter.tags
				? (Array.isArray(this.card.frontmatter.tags) ? this.card.frontmatter.tags : [this.card.frontmatter.tags])
				: [];

			const boardTag = this.boardConfig.tagFilter?.replace('#', '');
			const updatedTags = tags
				.map((t: string) => t.replace('#', ''))
				.filter((t: string) => t !== tagToRemove);

			// Always keep the board tag
			if (boardTag && !updatedTags.includes(boardTag)) {
				updatedTags.push(boardTag);
			}

			await this.dataManager.updateCardTags(this.card.file, updatedTags);

			// Update card in-place instead of full refresh
			this.card.frontmatter.tags = updatedTags.length === 1 ? updatedTags[0] : (updatedTags.length > 0 ? updatedTags : undefined);
			this.refreshCardContent();
		} catch (error) {
			console.error('Failed to remove tag:', error);
		}
	}

	private refreshCardContent(): void {
		// Find and update only the card body and footer
		const bodyEl = this.element.querySelector('.kanban-card-body');
		const footerEl = this.element.querySelector('.kanban-card-footer');

		if (bodyEl) {
			bodyEl.empty();
		}
		if (footerEl) {
			footerEl.empty();
		}

		if (bodyEl && footerEl) {
			this.renderProperties(bodyEl as HTMLElement, footerEl as HTMLElement);
		}
	}

	private showAddTagInput(container: HTMLElement, addBtn: HTMLElement): void {
		if (!this.dataManager) return;

		// Hide the add button temporarily
		addBtn.style.display = 'none';

		// Create input element
		const inputWrapper = container.createSpan({ cls: 'kanban-tag-input-wrapper' });
		const input = inputWrapper.createEl('input', {
			cls: 'kanban-tag-input',
			attr: {
				type: 'text',
				placeholder: 'tag name',
				autocomplete: 'off'
			}
		});

		// Create autocomplete dropdown - attach to document body for proper positioning
		const suggestionList = document.body.createDiv({ cls: 'kanban-tag-suggestions' });
		let selectedIndex = -1;
		let currentSuggestions: string[] = [];

		// Position the dropdown relative to the input
		const updateDropdownPosition = () => {
			const rect = input.getBoundingClientRect();
			suggestionList.style.position = 'fixed';
			suggestionList.style.left = `${rect.left}px`;
			suggestionList.style.top = `${rect.bottom + 2}px`;
			suggestionList.style.minWidth = `${Math.max(150, rect.width)}px`;
		};

		// Get all unique tags from vault
		const getAllVaultTags = (): string[] => {
			if (this.dataManager) {
				const allTags = this.dataManager.getAllVaultTags();

				// Exclude board tag and already added tags
				const boardTag = this.boardConfig.tagFilter?.replace('#', '');
				const existingTags = this.card.frontmatter.tags
					? (Array.isArray(this.card.frontmatter.tags) ? this.card.frontmatter.tags : [this.card.frontmatter.tags])
					: [];
				const existingClean = existingTags.map((t: string) => t.replace(/^#/, ''));

				return allTags
					.filter(t => t !== boardTag && !existingClean.includes(t));
			}
			return [];
		};

		const updateSuggestions = (query: string) => {
			const allTags = getAllVaultTags();
			currentSuggestions = query
				? allTags.filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
				: allTags;

			selectedIndex = -1;
			updateDropdownPosition();
			renderSuggestions();
		};

		const renderSuggestions = () => {
			suggestionList.empty();

			if (currentSuggestions.length === 0) {
				suggestionList.style.display = 'none';
				return;
			}

			suggestionList.style.display = 'block';
			const maxSuggestions = 8;
			currentSuggestions.slice(0, maxSuggestions).forEach((tag, index) => {
				const item = suggestionList.createDiv({
					cls: 'kanban-tag-suggestion-item',
					text: tag
				});

				if (index === selectedIndex) {
					item.addClass('selected');
				}

				item.addEventListener('mousedown', (e) => {
					e.preventDefault();
					input.value = tag;
					finishAdd(true);
				});

				item.addEventListener('mouseenter', () => {
					selectedIndex = index;
					renderSuggestions();
				});
			});
		};

		input.addEventListener('click', (e) => e.stopPropagation());

		const finishAdd = async (save: boolean) => {
			const newTag = input.value.trim().replace(/^#/, '');

			if (save && newTag && this.dataManager) {
				try {
					const tags = this.card.frontmatter.tags
						? (Array.isArray(this.card.frontmatter.tags) ? this.card.frontmatter.tags : [this.card.frontmatter.tags])
						: [];

					const cleanTags = tags.map((t: string) => t.replace('#', ''));

					// Add new tag if it doesn't exist
					if (!cleanTags.includes(newTag)) {
						cleanTags.push(newTag);
						await this.dataManager.updateCardTags(this.card.file, cleanTags);

						// Update card in-place instead of full refresh
						this.card.frontmatter.tags = cleanTags.length === 1 ? cleanTags[0] : cleanTags;
						this.refreshCardContent();
					}
				} catch (error) {
					console.error('Failed to add tag:', error);
				}
			}

			suggestionList.remove();
			inputWrapper.remove();
			addBtn.style.display = '';
		};

		input.addEventListener('input', () => {
			updateSuggestions(input.value.trim().replace(/^#/, ''));
		});

		input.addEventListener('keydown', async (e) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				if (currentSuggestions.length > 0) {
					selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
					renderSuggestions();
				}
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				if (currentSuggestions.length > 0) {
					selectedIndex = Math.max(selectedIndex - 1, -1);
					renderSuggestions();
				}
			} else if (e.key === 'Enter') {
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
					input.value = currentSuggestions[selectedIndex];
				}
				await finishAdd(true);
			} else if (e.key === 'Escape') {
				await finishAdd(false);
			}
		});

		input.addEventListener('blur', async () => {
			setTimeout(() => finishAdd(true), 150);
		});

		setTimeout(() => {
			input.focus();
			updateSuggestions('');
		}, 0);
	}
}
