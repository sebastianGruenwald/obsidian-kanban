// Mock Obsidian API for testing
export class Notice {
	constructor(public message: string, public timeout?: number) {}
}

export class App {
	vault = {
		getMarkdownFiles: vi.fn(() => []),
		getAbstractFileByPath: vi.fn(),
		read: vi.fn(),
		modify: vi.fn(),
		create: vi.fn()
	};
	
	metadataCache = {
		getFileCache: vi.fn(() => null),
		on: vi.fn()
	};
	
	workspace = {
		getLeavesOfType: vi.fn(() => []),
		getLeaf: vi.fn(),
		on: vi.fn(),
		revealLeaf: vi.fn(),
		getRightLeaf: vi.fn()
	};
}

export class Plugin {
	app!: App;
	manifest: any;
	
	loadData(): Promise<any> {
		return Promise.resolve(null);
	}
	
	saveData(data: any): Promise<void> {
		return Promise.resolve();
	}
	
	addRibbonIcon(icon: string, title: string, callback: () => void) {}
	addCommand(command: any) {}
	addSettingTab(tab: any) {}
	registerView(type: string, viewCreator: any) {}
	registerEvent(eventRef: any) {}
	register(callback: () => void) {}
}

export class ItemView {
	app!: App;
	leaf: any;
	containerEl: any = {
		children: [null, document.createElement('div')]
	};
	
	constructor(leaf: any) {
		this.leaf = leaf;
	}
	
	getViewType(): string { return ''; }
	getDisplayText(): string { return ''; }
	onOpen(): Promise<void> { return Promise.resolve(); }
	onClose(): Promise<void> { return Promise.resolve(); }
}

export class Modal {
	app!: App;
	contentEl = document.createElement('div');
	
	constructor(app: App) {
		this.app = app;
	}
	
	open() {}
	close() {}
}

export class PluginSettingTab {
	app!: App;
	plugin: any;
	containerEl = document.createElement('div');
	
	constructor(app: App, plugin: any) {
		this.app = app;
		this.plugin = plugin;
	}
	
	display() {}
	hide() {}
}

export class Setting {
	constructor(containerEl: HTMLElement) {}
	setName(name: string): this { return this; }
	setDesc(desc: string): this { return this; }
	setClass(cls: string): this { return this; }
	addText(cb: (text: any) => void): this { 
		cb({ setValue: vi.fn(), getValue: vi.fn(() => ''), setPlaceholder: vi.fn(), inputEl: document.createElement('input') });
		return this;
	}
	addTextArea(cb: (text: any) => void): this { 
		cb({ setValue: vi.fn(), getValue: vi.fn(() => ''), setPlaceholder: vi.fn() });
		return this;
	}
	addToggle(cb: (toggle: any) => void): this {
		cb({ setValue: vi.fn(), getValue: vi.fn(() => false), onChange: vi.fn() });
		return this;
	}
	addDropdown(cb: (dropdown: any) => void): this {
		cb({ addOption: vi.fn(), setValue: vi.fn(), getValue: vi.fn(() => ''), onChange: vi.fn() });
		return this;
	}
	addButton(cb: (button: any) => void): this {
		cb({ setButtonText: vi.fn().mockReturnThis(), setCta: vi.fn().mockReturnThis(), setWarning: vi.fn().mockReturnThis(), onClick: vi.fn().mockReturnThis() });
		return this;
	}
}

export class TextComponent {
	setValue(value: string): this { return this; }
	getValue(): string { return ''; }
	setPlaceholder(placeholder: string): this { return this; }
	inputEl = document.createElement('input');
}

export class Menu {
	addItem(cb: (item: any) => void): this {
		cb({
			setTitle: vi.fn().mockReturnThis(),
			setIcon: vi.fn().mockReturnThis(),
			onClick: vi.fn().mockReturnThis()
		});
		return this;
	}
	addSeparator(): this { return this; }
	showAtMouseEvent(event: MouseEvent): void {}
}

export class TFile {
	path = '';
	basename = '';
	extension = 'md';
	stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TAbstractFile {
	path = '';
}

export class WorkspaceLeaf {
	view: any;
	openFile(file: TFile): Promise<void> { return Promise.resolve(); }
	setViewState(viewState: any): Promise<void> { return Promise.resolve(); }
}

export interface CachedMetadata {
	frontmatter?: Record<string, any>;
	tags?: Array<{ tag: string; position: any }>;
}
