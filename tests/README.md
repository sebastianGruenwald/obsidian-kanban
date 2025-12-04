# Tests

This directory contains the test suite for the Obsidian Kanban plugin.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

```
tests/
├── boardManager.test.ts          # Board management tests
├── utils.test.ts                 # Utility function tests
├── dataManager.test.ts           # Data operations tests
├── searchFilterService.test.ts   # Search and filter tests
└── mocks/
    └── obsidian.ts               # Mock Obsidian API
```

## Writing Tests

### Test File Naming

- Test files should end with `.test.ts`
- Test files should mirror the structure of `src/`
- Name test files after the module they test

### Test Structure

Follow the AAA (Arrange, Act, Assert) pattern:

```typescript
it('should filter cards by tag', () => {
	// Arrange
	const service = new SearchFilterService();
	const cards = createMockCards();
	
	// Act
	const result = service.filterCards(cards, { selectedTags: new Set(['work']) });
	
	// Assert
	expect(result).toHaveLength(2);
	expect(result[0].frontmatter.tags).toContain('work');
});
```

### Descriptive Test Names

Use descriptive test names that explain what is being tested:

```typescript
// Good
it('should return empty array when no cards match filter')
it('should sort cards by creation date in ascending order')
it('should throw error when board ID does not exist')

// Bad
it('test filter')
it('should work')
it('sorting')
```

### Testing Async Code

```typescript
it('should create new card with correct frontmatter', async () => {
	const manager = new DataManager(mockApp, config, settings);
	
	await manager.createNewCard('To Do', 'Test Card');
	
	expect(mockApp.vault.create).toHaveBeenCalledWith(
		'Test Card.md',
		expect.stringContaining('# Test Card')
	);
});
```

### Mocking

Use Vitest's mocking utilities:

```typescript
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);

// Mock a module
vi.mock('../src/utils', () => ({
	getAllTags: vi.fn(() => ['tag1', 'tag2'])
}));
```

## Coverage Goals

Aim for:
- **80%+** line coverage
- **70%+** branch coverage
- **100%** coverage for utility functions

Check coverage with:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Test Categories

### Unit Tests

Test individual functions and classes in isolation:

```typescript
describe('SearchFilterService', () => {
	describe('filterCards', () => {
		it('should filter by search query', () => {
			// Test implementation
		});
	});
});
```

### Integration Tests

Test interactions between components:

```typescript
describe('DataManager Integration', () => {
	it('should update card and refresh cache', async () => {
		// Test implementation
	});
});
```

## Debugging Tests

### Run Specific Test

```bash
# Run a specific test file
npm test -- boardManager.test.ts

# Run tests matching a pattern
npm test -- --grep "should filter"
```

### Enable Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug in VS Code

Add this configuration to `.vscode/launch.json`:

```json
{
	"type": "node",
	"request": "launch",
	"name": "Debug Tests",
	"runtimeExecutable": "npm",
	"runtimeArgs": ["test"],
	"console": "integratedTerminal",
	"internalConsoleOptions": "neverOpen"
}
```

## Common Patterns

### Creating Mock Cards

```typescript
function createMockCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
	return {
		file: 'test.md',
		title: 'Test Card',
		column: 'To Do',
		created: Date.now(),
		modified: Date.now(),
		content: 'Test content',
		frontmatter: {},
		...overrides
	};
}
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
	mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
	
	await expect(
		dataManager.updateCard('nonexistent.md')
	).rejects.toThrow('File not found');
});
```

### Testing State Changes

```typescript
it('should update state and notify listeners', () => {
	const stateManager = new ViewStateManager();
	const listener = vi.fn();
	
	stateManager.subscribe(listener);
	stateManager.setCards(mockCards);
	
	expect(listener).toHaveBeenCalledWith(
		expect.objectContaining({ cards: mockCards })
	);
});
```

## Best Practices

1. **Test behavior, not implementation**
   - Focus on what the code does, not how it does it
   - Avoid testing private methods directly

2. **Keep tests independent**
   - Each test should be able to run in isolation
   - Use `beforeEach` to set up fresh state

3. **Use meaningful assertions**
   - Check specific values, not just truthiness
   - Use appropriate matchers (toEqual, toContain, etc.)

4. **Test edge cases**
   - Empty arrays
   - Null/undefined values
   - Invalid inputs
   - Boundary conditions

5. **Mock external dependencies**
   - Mock Obsidian API calls
   - Mock file system operations
   - Mock network requests

## Continuous Integration

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Pre-commit hook (local)

See `.github/workflows/ci.yml` for CI configuration.

## Troubleshooting

### Tests Failing Locally But Passing in CI

- Check Node.js version matches CI (see package.json engines)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for local environment variables

### Mock Not Working

- Ensure mock is defined before import
- Check mock path matches actual import path
- Use `vi.clearAllMocks()` in `beforeEach`

### Timeout Errors

Increase timeout for slow tests:

```typescript
it('should handle large dataset', async () => {
	// Test implementation
}, 10000); // 10 second timeout
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Obsidian Plugin Testing Guide](https://docs.obsidian.md/Plugins/Testing)
