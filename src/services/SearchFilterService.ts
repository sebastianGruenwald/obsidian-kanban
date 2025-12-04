import { KanbanCard } from '../types';

export interface SearchFilterOptions {
	searchQuery?: string;
	selectedTags?: Set<string>;
	excludeTags?: Set<string>;
	dateRange?: {
		start?: number;
		end?: number;
	};
}

export class SearchFilterService {
	/**
	 * Filter cards based on search query and tag selection
	 */
	filterCards(cards: KanbanCard[], options: SearchFilterOptions): KanbanCard[] {
		const { searchQuery, selectedTags, excludeTags, dateRange } = options;

		return cards.filter(card => {
			// Search query filter
			if (searchQuery && !this.matchesSearchQuery(card, searchQuery)) {
				return false;
			}

			// Tag filter
			if (selectedTags && selectedTags.size > 0 && !this.matchesTags(card, selectedTags)) {
				return false;
			}

			// Exclude tags filter
			if (excludeTags && excludeTags.size > 0 && this.hasAnyTag(card, excludeTags)) {
				return false;
			}

			// Date range filter
			if (dateRange && !this.matchesDateRange(card, dateRange)) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Check if card matches search query
	 */
	private matchesSearchQuery(card: KanbanCard, query: string): boolean {
		const lowerQuery = query.toLowerCase();
		
		return (
			card.title.toLowerCase().includes(lowerQuery) ||
			card.content.toLowerCase().includes(lowerQuery) ||
			this.searchInFrontmatter(card, lowerQuery)
		);
	}

	/**
	 * Search in frontmatter values
	 */
	private searchInFrontmatter(card: KanbanCard, query: string): boolean {
		for (const value of Object.values(card.frontmatter)) {
			if (value === null || value === undefined) continue;
			
			const stringValue = String(value).toLowerCase();
			if (stringValue.includes(query)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if card has any of the selected tags
	 */
	private matchesTags(card: KanbanCard, selectedTags: Set<string>): boolean {
		const cardTags = this.getCardTags(card);
		return cardTags.some(tag => selectedTags.has(tag));
	}

	/**
	 * Check if card has any of the excluded tags
	 */
	private hasAnyTag(card: KanbanCard, excludeTags: Set<string>): boolean {
		const cardTags = this.getCardTags(card);
		return cardTags.some(tag => excludeTags.has(tag));
	}

	/**
	 * Get tags from card frontmatter
	 */
	private getCardTags(card: KanbanCard): string[] {
		const tags = card.frontmatter.tags;
		if (!tags) return [];
		
		const tagArray = Array.isArray(tags) ? tags : [tags];
		return tagArray.map((t: string) => t.replace(/^#/, ''));
	}

	/**
	 * Check if card matches date range
	 */
	private matchesDateRange(card: KanbanCard, dateRange: { start?: number; end?: number }): boolean {
		const { start, end } = dateRange;
		
		if (start && card.created < start) {
			return false;
		}
		
		if (end && card.created > end) {
			return false;
		}
		
		return true;
	}

	/**
	 * Get all unique tags from a list of cards
	 */
	getAllTags(cards: KanbanCard[]): string[] {
		const tagSet = new Set<string>();
		
		for (const card of cards) {
			const cardTags = this.getCardTags(card);
			cardTags.forEach(tag => tagSet.add(tag));
		}
		
		return Array.from(tagSet).sort();
	}

	/**
	 * Get tag statistics (count per tag)
	 */
	getTagStatistics(cards: KanbanCard[]): Map<string, number> {
		const tagCounts = new Map<string, number>();
		
		for (const card of cards) {
			const cardTags = this.getCardTags(card);
			cardTags.forEach(tag => {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			});
		}
		
		return tagCounts;
	}
}
