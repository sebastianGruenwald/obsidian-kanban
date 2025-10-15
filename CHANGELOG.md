# Changelog

All notable changes to the Kanban Board plugin will be documented in this file.

## [1.0.0] - 2024-10-15

### Added
- Initial release of Kanban Board plugin
- Support for filtering notes by tag (#kanban by default)
- Frontmatter-based column assignment
- Drag and drop functionality between columns
- Sorting options (creation date, modification date, title)
- Column ordering and layout persistence
- Auto-refresh when files change
- Configurable settings panel
- Right-click context menu for cards
- Responsive design with mobile support
- Custom CSS styling
- File count display in column headers

### Features
- **Tag-based filtering**: Only notes with specified tag appear in kanban
- **Flexible columns**: Use any frontmatter property to define columns
- **Drag & Drop**: Move cards between columns with visual feedback
- **Smart sorting**: Multiple sorting options within columns
- **Auto-refresh**: Board updates automatically when files change
- **Customizable**: Extensive settings for personalization
- **Accessible**: Keyboard and screen reader friendly
- **Performance**: Efficient rendering for large numbers of notes

### Technical Details
- Built with TypeScript and esbuild
- Uses Obsidian API for file operations
- Responsive CSS with theme support
- Modular architecture for easy maintenance
- Type-safe interfaces throughout

### Settings
- Tag filter configuration
- Column property selection
- Default columns setup
- Sort options (by date, title, etc.)
- Auto-refresh toggle
- File count display toggle
- Column order persistence

### Known Limitations
- Requires notes to have frontmatter for column assignment
- Limited to one kanban board view at a time
- No nested column support (yet)
- No card priorities or labels (yet)

### Future Enhancements
- Multiple board support
- Card templates
- Due date tracking
- Progress indicators
- Export functionality
- Collaboration features
- Advanced filtering options