# Deployment Guide

## For End Users

### Option 1: Manual Installation (Recommended)
1. Download the release files: `main.js`, `manifest.json`, and `styles.css`
2. Create folder: `<vault>/.obsidian/plugins/kanban-board/`
3. Copy files to this folder
4. Restart Obsidian
5. Enable plugin in Settings → Community Plugins

### Option 2: BRAT Installation
1. Install the BRAT plugin
2. Add this repository URL to BRAT
3. Let BRAT handle the installation

## For Developers

### Development Setup
```bash
# Clone the repository
git clone <repo-url> kanban-board
cd kanban-board

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Building for Release
```bash
# Build production version
npm run build

# Clean build artifacts
npm run clean
```

### File Structure for Release
The following files are needed for distribution:
- `main.js` (compiled plugin code)
- `manifest.json` (plugin metadata)
- `styles.css` (optional styling)

### Publishing to Community Plugins
1. Follow Obsidian's plugin submission guidelines
2. Ensure all code passes review
3. Submit PR to obsidian-releases repository

## Testing the Plugin

### Manual Testing Steps
1. Create test notes with `#kanban` tag
2. Add frontmatter with `status` property
3. Open kanban board view
4. Test drag and drop functionality
5. Verify settings work correctly
6. Test auto-refresh on file changes

### Example Test Notes
See `EXAMPLES.md` for sample notes to test with.

## Troubleshooting

### Plugin Not Loading
- Check console for errors (Ctrl+Shift+I)
- Verify `main.js` and `manifest.json` are present
- Try disabling and re-enabling plugin

### Cards Not Appearing
- Ensure notes have the correct tag (`#kanban` by default)
- Check frontmatter property name matches settings
- Verify frontmatter syntax is correct

### Drag and Drop Issues
- Clear browser cache
- Disable other plugins temporarily
- Check for JavaScript errors in console

## Customization

### Changing Default Settings
Edit `src/types.ts` and rebuild:
```typescript
export const DEFAULT_SETTINGS: KanbanSettings = {
    tagFilter: '#your-tag',
    columnProperty: 'your-property',
    defaultColumns: ['Your', 'Custom', 'Columns'],
    // ... other settings
};
```

### Custom Styling
Modify `styles.css` or add custom CSS in Obsidian's appearance settings.

### Adding Features
1. Update TypeScript interfaces in `src/types.ts`
2. Implement logic in appropriate files
3. Update settings if needed
4. Rebuild and test