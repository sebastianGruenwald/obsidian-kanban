import { describe, it, expect, beforeEach } from 'vitest';
import { SearchFilterService } from '../src/services/SearchFilterService';
import { KanbanCard } from '../src/types';

describe('SearchFilterService', () => {
	let service: SearchFilterService;
	let mockCards: KanbanCard[];

	beforeEach(() => {
		service = new SearchFilterService();
		
		mockCards = [
			{
				file: 'card1.md',
				title: 'Buy groceries',
				column: 'To Do',
				created: 1000,
				modified: 2000,
				content: 'Need to buy milk and eggs',
				frontmatter: {
					tags: ['shopping', 'urgent'],
					priority: 'high',
				},
			},
			{
				file: 'card2.md',
				title: 'Write report',
				column: 'In Progress',
				created: 2000,
				modified: 3000,
				content: 'Quarterly business report',
				frontmatter: {
					tags: ['work'],
					priority: 'medium',
				},
			},
			{
				file: 'card3.md',
				title: 'Plan vacation',
				column: 'To Do',
				created: 3000,
				modified: 4000,
				content: 'Research destinations',
				frontmatter: {
					tags: ['personal', 'travel'],
				},
			},
		];
	});

	describe('filterCards', () => {
		it('should return all cards when no filters applied', () => {
			const filtered = service.filterCards(mockCards, {});
			expect(filtered).toHaveLength(3);
		});

		it('should filter by search query in title', () => {
			const filtered = service.filterCards(mockCards, {
				searchQuery: 'buy',
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Buy groceries');
		});

		it('should filter by search query in content', () => {
			const filtered = service.filterCards(mockCards, {
				searchQuery: 'report',
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Write report');
		});

		it('should filter by search query in frontmatter', () => {
			const filtered = service.filterCards(mockCards, {
				searchQuery: 'high',
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Buy groceries');
		});

		it('should filter by selected tags', () => {
			const filtered = service.filterCards(mockCards, {
				selectedTags: new Set(['work']),
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Write report');
		});

		it('should filter by multiple selected tags (OR)', () => {
			const filtered = service.filterCards(mockCards, {
				selectedTags: new Set(['work', 'travel']),
			});
			expect(filtered).toHaveLength(2);
		});

		it('should exclude tags', () => {
			const filtered = service.filterCards(mockCards, {
				excludeTags: new Set(['urgent']),
			});
			expect(filtered).toHaveLength(2);
			expect(filtered.find(c => c.title === 'Buy groceries')).toBeUndefined();
		});

		it('should filter by date range', () => {
			const filtered = service.filterCards(mockCards, {
				dateRange: { start: 1500, end: 2500 },
			});
			expect(filtered).toHaveLength(1);
			expect(filtered[0].title).toBe('Write report');
		});

		it('should combine multiple filters', () => {
			const filtered = service.filterCards(mockCards, {
				searchQuery: 'o',
				selectedTags: new Set(['shopping', 'work']),
			});
			expect(filtered).toHaveLength(2); // "Buy groceries" and "Write report" both have 'o' and matching tags
		});
	});

	describe('getAllTags', () => {
		it('should extract all unique tags', () => {
			const tags = service.getAllTags(mockCards);
			expect(tags).toContain('shopping');
			expect(tags).toContain('urgent');
			expect(tags).toContain('work');
			expect(tags).toContain('personal');
			expect(tags).toContain('travel');
		});

		it('should return sorted tags', () => {
			const tags = service.getAllTags(mockCards);
			const sorted = [...tags].sort();
			expect(tags).toEqual(sorted);
		});

		it('should handle cards without tags', () => {
			const cardsWithoutTags = [
				{
					...mockCards[0],
					frontmatter: {},
				},
			];
			const tags = service.getAllTags(cardsWithoutTags);
			expect(tags).toHaveLength(0);
		});
	});

	describe('getTagStatistics', () => {
		it('should count tag occurrences', () => {
			const stats = service.getTagStatistics(mockCards);
			expect(stats.get('shopping')).toBe(1);
			expect(stats.get('urgent')).toBe(1);
			expect(stats.get('work')).toBe(1);
			expect(stats.get('personal')).toBe(1);
			expect(stats.get('travel')).toBe(1);
		});

		it('should handle duplicate tags across cards', () => {
			const cards = [
				{ ...mockCards[0], frontmatter: { tags: ['common'] } },
				{ ...mockCards[1], frontmatter: { tags: ['common'] } },
				{ ...mockCards[2], frontmatter: { tags: ['common'] } },
			];
			const stats = service.getTagStatistics(cards);
			expect(stats.get('common')).toBe(3);
		});
	});
});
