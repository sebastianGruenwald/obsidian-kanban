import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'**/*.config.*',
				'**/dist/**'
			]
		}
	},
	resolve: {
		alias: {
			obsidian: resolve(__dirname, './tests/mocks/obsidian.ts')
		}
	}
});
