import { App, PluginSettingTab, Setting } from 'obsidian';
import KanbanPlugin from './main';

export class KanbanSettingTab extends PluginSettingTab {
	plugin: KanbanPlugin;

	constructor(app: App, plugin: KanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Kanban Board Settings' });

		new Setting(containerEl)
			.setName('Tag filter')
			.setDesc('Only notes with this tag will be included in the kanban board')
			.addText(text => text
				.setPlaceholder('#kanban')
				.setValue(this.plugin.settings.tagFilter)
				.onChange(async (value) => {
					this.plugin.settings.tagFilter = value;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(containerEl)
			.setName('Column property')
			.setDesc('Frontmatter property that determines which column a note belongs to')
			.addText(text => text
				.setPlaceholder('status')
				.setValue(this.plugin.settings.columnProperty)
				.onChange(async (value) => {
					this.plugin.settings.columnProperty = value;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(containerEl)
			.setName('Default columns')
			.setDesc('Columns that will always appear, even if empty (comma-separated)')
			.addTextArea(text => text
				.setPlaceholder('To Do, In Progress, Done')
				.setValue(this.plugin.settings.defaultColumns.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.defaultColumns = value
						.split(',')
						.map(col => col.trim())
						.filter(col => col.length > 0);
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(containerEl)
			.setName('Sort by')
			.setDesc('How to sort cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('creation', 'Creation date')
				.addOption('modification', 'Modification date')
				.addOption('title', 'Title')
				.addOption('none', 'No sorting')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as any;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(containerEl)
			.setName('Sort order')
			.setDesc('Sort order for cards within columns')
			.addDropdown(dropdown => dropdown
				.addOption('asc', 'Ascending')
				.addOption('desc', 'Descending')
				.setValue(this.plugin.settings.sortOrder)
				.onChange(async (value) => {
					this.plugin.settings.sortOrder = value as any;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));

		new Setting(containerEl)
			.setName('Auto-refresh')
			.setDesc('Automatically refresh the kanban board when files change')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoRefresh)
				.onChange(async (value) => {
					this.plugin.settings.autoRefresh = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show file count')
			.setDesc('Show the number of files in each column header')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFileCount)
				.onChange(async (value) => {
					this.plugin.settings.showFileCount = value;
					await this.plugin.saveSettings();
					this.plugin.refreshAllViews();
				}));
	}
}