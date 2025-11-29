# Development Guide

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup Steps
1. **Clone the repository**
   ```bash
   git clone <repo-url> kanban-board
   cd kanban-board
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development mode**
   ```bash
   npm run dev
   ```
   This will start a watch process that recompiles the plugin on file changes.

## Building for Release

To create a production build:

```bash
# Build production version
npm run build
```

To clean build artifacts:
```bash
npm run clean
```

## Release Process

### Using the Release Script
```bash
./release.sh 2.1.0
```

### Manual Process
1. Update version in `package.json` and `manifest.json`.
2. Run version bump:
   ```bash
   npm version 2.1.0
   npm run version
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Commit and tag:
   ```bash
   git add . && git commit -m "Release 2.1.0"
   git tag 2.1.0
   git push && git push --tags
   ```

### GitHub Actions
The repository is configured with GitHub Actions to automatically:
1. Detect new tags.
2. Build the plugin.
3. Create a GitHub release with the necessary files (`main.js`, `manifest.json`, `styles.css`).

## File Structure

- `src/`: Source code (TypeScript).
- `styles.css`: CSS styles.
- `manifest.json`: Plugin metadata.
- `esbuild.config.mjs`: Build configuration.
- `deployment/`: Directory where built files are output (optional, depending on config).

## Customization

### Changing Default Settings
Edit `src/types.ts` to modify `DEFAULT_SETTINGS`.

### Adding Features
1. Update TypeScript interfaces in `src/types.ts`.
2. Implement logic in appropriate files (`src/main.ts`, `src/kanbanView.ts`, etc.).
3. Update settings in `src/settings.ts` if needed.
4. Rebuild and test.
