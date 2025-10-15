# Installation Instructions

## Manual Installation

1. Download the latest release files:
   - `main.js`
   - `manifest.json`
   - `styles.css` (if present)

2. Create a new folder in your vault's `.obsidian/plugins/` directory called `kanban-board`

3. Copy the downloaded files into `.obsidian/plugins/kanban-board/`

4. Restart Obsidian or reload the app

5. Go to Settings → Community Plugins and enable "Kanban Board"

## Development Installation

If you want to develop or customize the plugin:

1. Clone this repository into your vault's `.obsidian/plugins/` directory:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone <repository-url> kanban-board
   cd kanban-board
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Enable the plugin in Obsidian settings

## Usage

1. Add the tag `#kanban` (or your configured tag) to notes you want to include
2. Add a frontmatter property to define the column:
   ```yaml
   ---
   status: "To Do"
   ---
   ```
3. Open the kanban board from the ribbon icon or command palette

## Configuration

The plugin can be configured in Settings → Plugin Options → Kanban Board:

- **Tag Filter**: Change which tag identifies kanban notes
- **Column Property**: Change which frontmatter property defines columns
- **Default Columns**: Set columns that always appear
- **Sorting**: Configure how cards are sorted within columns