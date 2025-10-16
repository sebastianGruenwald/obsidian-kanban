# Changelog

All notable changes to the Kanban Board plugin will be documented in this file.

## [2.0.0] - 2024-10-16

### ✨ Major New Features

#### Multiple Boards Support
- **Create unlimited kanban boards** with different tag filters
- **Board-specific configurations** for columns, properties, and settings
- **Easy board switching** via dropdown selector in board header
- **Board management** through settings panel (create, delete, configure)

#### Dynamic Column Management
- **Add custom columns** per board via + button or settings
- **Delete custom columns** (right-click column header)
- **Board-specific column sets** - each board can have different columns
- **Column ordering** and layout persistence per board

#### Enhanced Card Creation
- **Quick card creation** with + button in column headers
- **Auto-generated frontmatter** with correct column assignment
- **Unique filename handling** prevents conflicts
- **Modal-based creation** for better UX

#### Configurable Card Properties
- **Per-board property visibility** - choose what shows on cards
- **Flexible property system** - show any frontmatter property
- **Common properties** like created date, tags, assignee, priority
- **Custom property display** with appropriate styling

### 🎨 UI/UX Improvements
- **Board header** with title and controls
- **Board selector dropdown** for quick switching
- **Refresh button** for manual board updates
- **Column controls** (add cards, column options)
- **Improved card layout** with configurable property display
- **Enhanced responsive design** for mobile devices

### ⚙️ Settings Enhancements
- **Multi-board settings panel** with board selection
- **Board-specific configuration** sections
- **Visual property toggles** for easy customization
- **Board creation/deletion** modals
- **Column management** interface

### 🔧 Technical Improvements
- **BoardManager class** for centralized board operations
- **Enhanced DataManager** with board-specific operations
- **Improved type definitions** for better code maintainability
- **Modular architecture** for easier feature additions

### 📱 Better Mobile Support
- **Responsive board header** that stacks on mobile
- **Touch-friendly controls** for mobile interactions
- **Optimized layout** for smaller screens

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

## Migration Guide (1.0 → 2.0)

### Automatic Migration
Your existing settings will be automatically migrated to the new multi-board system:
- Your current board becomes the "Default Kanban" board
- All existing settings are preserved
- No action required

### New Configuration Options
After updating, you can:
1. Create additional boards for different workflows
2. Configure board-specific visible properties
3. Add custom columns per board
4. Set up different tag filters for different projects

### Recommended Workflow
1. **Backup your vault** before updating (standard practice)
2. **Update the plugin** 
3. **Test with existing notes** to ensure everything works
4. **Explore new features** like multiple boards and custom columns
5. **Configure property visibility** to optimize card display

### Breaking Changes
- None - fully backward compatible
- Settings format updated but automatically migrated

## Roadmap

### Planned Features
- **Drag-to-reorder columns** within boards
- **Board templates** for quick setup
- **Card templates** with predefined properties
- **Due date tracking** with visual indicators
- **Progress indicators** and completion percentages
- **Advanced filtering** and search within boards
- **Export functionality** (PDF, CSV, etc.)
- **Collaboration features** for shared vaults
- **Custom card styling** options
- **Automation rules** for card movement

### Long-term Vision
- **Integration with other plugins** (Calendar, Tasks, etc.)
- **Advanced analytics** and reporting
- **Mobile app optimization**
- **API for developers** to extend functionality