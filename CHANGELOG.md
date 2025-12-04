# Changelog

All notable changes to the Kanban Board plugin will be documented in this file.

## [3.0.0] - 2025-12-04

### 🚀 Major Refactoring & Improvements

#### Architecture Enhancements
- **Centralized Error Handling**: New `ErrorHandler` service for consistent error management across the plugin
- **Settings Migration System**: Automatic migration of settings with version tracking and validation
- **Service Layer Architecture**: Separated concerns with dedicated services for search/filter, state management, and caching
- **Improved Type Safety**: Removed `any` types, added strict interfaces for `CardFrontmatter` and other data structures
- **Memory Leak Fixes**: Improved view lifecycle management with proper cleanup

#### New Services
- **SearchFilterService**: Advanced filtering with search queries, tag selection, and date ranges
- **ViewStateManager**: Reactive state management with subscription-based updates
- **DataCacheService**: Intelligent caching system with TTL and automatic invalidation
- **SettingsMigrator**: Automatic settings upgrades with validation

#### Developer Experience
- **Comprehensive Tests**: Added test suites for DataManager, SearchFilterService, and other core components
- **Enhanced Build Scripts**: Added format, format:check, precommit, and validate scripts
- **ESLint Configuration**: Improved linting rules with stricter type checking
- **Prettier Integration**: Code formatting with .prettierrc.json configuration
- **CI/CD Pipeline**: GitHub Actions workflows for testing and building
- **API Documentation**: Complete API reference in docs/API.md
- **Contributing Guide**: Detailed CONTRIBUTING.md with development guidelines

#### Accessibility Improvements
- **ARIA Labels**: Added proper ARIA attributes to cards, columns, and buttons
- **Keyboard Navigation**: Support for Enter, Space, F2, and Delete keys on cards
- **Screen Reader Support**: Enhanced announcements for WIP limits and card actions
- **Focus Management**: Improved tab navigation through kanban boards

#### Code Quality
- **Constants Consolidation**: Moved magic strings to `FRONTMATTER_KEYS` constant
- **Error Messages**: Consistent, user-friendly error messages across the plugin
- **JSDoc Comments**: Added comprehensive documentation for public APIs
- **Type Definitions**: Proper interfaces for all data structures

#### Performance Optimizations
- **Data Caching**: Reduced redundant file reads with intelligent cache
- **Batch Rendering**: Improved rendering performance for large boards
- **Debounced Operations**: Optimized refresh and search operations

### 🔧 Technical Debt Reduction
- **TypeScript Configuration**: Updated to ES2018 for `includes()` and `matchAll()` support
- **View Cleanup**: Fixed memory leaks in view management
- **Settings Validation**: Added validation before saving settings
- **Error Propagation**: Consistent error handling throughout the codebase

### 📚 Documentation
- **API Documentation**: Complete developer reference
- **Contributing Guidelines**: Detailed contribution workflow
- **Code Examples**: Practical examples for common use cases
- **Architecture Overview**: Service layer and component documentation

### 🧪 Testing
- **Unit Tests**: Comprehensive test coverage for core services
- **Test Infrastructure**: Vitest configuration with coverage reporting
- **Mock System**: Improved mocking for Obsidian API

### ⚠️ Breaking Changes
- Settings structure has changed (automatic migration included)
- Some internal APIs have been refactored (affects custom extensions)
- Error handling now uses ErrorHandler service (old console.error calls deprecated)

### 📦 Dependencies
- Added `prettier` for code formatting
- Updated TypeScript target to ES2018
- Enhanced ESLint configuration

---

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