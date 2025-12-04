import { CachedMetadata, Notice } from 'obsidian';

/**
 * Extract all tags from a file's cache metadata
 */
export function getAllTags(cache: CachedMetadata | null): string[] {
	if (!cache) return [];
	
	const tags: string[] = [];
	
	// Get tags from frontmatter
	if (cache.frontmatter?.tags) {
		const frontmatterTags = Array.isArray(cache.frontmatter.tags) 
			? cache.frontmatter.tags 
			: [cache.frontmatter.tags];
		tags.push(...frontmatterTags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`));
	}
	
	// Get tags from content
	if (cache.tags) {
		tags.push(...cache.tags.map((tagCache) => tagCache.tag));
	}
	
	return tags;
}

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;
	
	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			timeout = null;
			func(...args);
		};
		
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(later, wait);
	};
}

/**
 * Ensure tag has # prefix
 */
export function normalizeTag(tag: string): string {
	if (!tag) return '';
	return tag.startsWith('#') ? tag : `#${tag}`;
}

/**
 * Validate board name (non-empty, reasonable length)
 */
export function validateBoardName(name: string): { valid: boolean; error?: string } {
	if (!name || name.trim().length === 0) {
		return { valid: false, error: 'Board name cannot be empty' };
	}
	if (name.length > 100) {
		return { valid: false, error: 'Board name too long (max 100 characters)' };
	}
	return { valid: true };
}

/**
 * Sanitize filename to remove invalid characters
 */
export function sanitizeFileName(name: string): string {
	return name
		.replace(/[\\/:*?"<>|]/g, '') // Remove invalid file characters
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();
}

/**
 * Show error notice to user
 */
export function showError(message: string): void {
	new Notice(`❌ ${message}`, 5000);
}

/**
 * Show success notice to user
 */
export function showSuccess(message: string): void {
	new Notice(`✅ ${message}`, 3000);
}

/**
 * Show info notice to user
 */
export function showInfo(message: string): void {
	new Notice(message, 3000);
}

/**
 * Generate unique ID for boards
 */
export function generateId(base: string, existingIds: string[]): string {
	const baseId = base.toLowerCase().replace(/[^a-z0-9]/g, '');
	let id = baseId;
	let counter = 1;

	while (existingIds.includes(id)) {
		id = `${baseId}_${counter}`;
		counter++;
	}

	return id;
}
