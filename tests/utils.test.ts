import { describe, it, expect } from 'vitest';
import {
	validateTag,
	normalizeTag,
	validateBoardName,
	validatePropertyName,
	sanitizeFileName,
	generateId
} from '../src/utils';

describe('Utils', () => {
	describe('validateTag', () => {
		it('should return true for valid tags', () => {
			expect(validateTag('#kanban')).toBe(true);
			expect(validateTag('#my-tag')).toBe(true);
			expect(validateTag('#tag123')).toBe(true);
		});

		it('should return false for invalid tags', () => {
			expect(validateTag('kanban')).toBe(false);
			expect(validateTag('')).toBe(false);
			expect(validateTag('   ')).toBe(false);
		});
	});

	describe('normalizeTag', () => {
		it('should add # prefix if missing', () => {
			expect(normalizeTag('kanban')).toBe('#kanban');
			expect(normalizeTag('my-tag')).toBe('#my-tag');
		});

		it('should keep # prefix if present', () => {
			expect(normalizeTag('#kanban')).toBe('#kanban');
			expect(normalizeTag('#my-tag')).toBe('#my-tag');
		});

		it('should handle empty strings', () => {
			expect(normalizeTag('')).toBe('');
		});
	});

	describe('validateBoardName', () => {
		it('should accept valid board names', () => {
			const result = validateBoardName('My Board');
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject empty names', () => {
			const result = validateBoardName('');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should reject names that are too long', () => {
			const longName = 'a'.repeat(101);
			const result = validateBoardName(longName);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('too long');
		});
	});

	describe('validatePropertyName', () => {
		it('should accept valid property names', () => {
			expect(validatePropertyName('status').valid).toBe(true);
			expect(validatePropertyName('my_property').valid).toBe(true);
			expect(validatePropertyName('_privateField').valid).toBe(true);
			expect(validatePropertyName('property123').valid).toBe(true);
			expect(validatePropertyName('valid-name').valid).toBe(true);
		});

		it('should reject invalid property names', () => {
			expect(validatePropertyName('').valid).toBe(false);
			expect(validatePropertyName('123invalid').valid).toBe(false);
			expect(validatePropertyName('invalid name').valid).toBe(false);
			expect(validatePropertyName('invalid.name').valid).toBe(false);
		});
	});

	describe('sanitizeFileName', () => {
		it('should remove invalid characters', () => {
			expect(sanitizeFileName('file:name*test')).toBe('filenametest');
			expect(sanitizeFileName('test<file>name')).toBe('testfilename');
		});

		it('should normalize whitespace', () => {
			expect(sanitizeFileName('file   name')).toBe('file name');
			expect(sanitizeFileName('  file  name  ')).toBe('file name');
		});

		it('should handle valid filenames', () => {
			expect(sanitizeFileName('valid-file-name')).toBe('valid-file-name');
		});
	});

	describe('generateId', () => {
		it('should generate unique IDs', () => {
			const existing = ['board1', 'board2'];
			const id1 = generateId('board', existing);
			const id2 = generateId('board', [...existing, id1]);
			
			expect(id1).not.toBe(id2);
			expect(existing).not.toContain(id1);
			expect([...existing, id1]).not.toContain(id2);
		});

		it('should sanitize base names', () => {
			const id = generateId('My Board!', []);
			expect(id).toMatch(/^myboard/);
		});

		it('should handle duplicates with counters', () => {
			const existing = ['myboard'];
			const id = generateId('My Board', existing);
			expect(id).toBe('myboard_1');
		});
	});
});
