import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import type CompassPlugin from './main';
import { FolderSuggest } from './ui/folder-suggest';

export { DEFAULT_SETTINGS } from './settings-defaults';
export type { CompassSettings } from './settings-defaults';

export function normalizeFolderPath(path: string): string {
	const trimmed = path.trim();
	if (trimmed === '' || trimmed === '/') return '';
	return normalizePath(trimmed);
}

export class CompassSettingTab extends PluginSettingTab {
	plugin: CompassPlugin;

	constructor(app: App, plugin: CompassPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Main notes folder')
			.setDesc('Folder that holds your main notes. Leave empty to use the vault root.')
			.addText((text) => {
				text
					.setPlaceholder('main')
					.setValue(this.plugin.settings.mainNotesFolder)
					.onChange(async (value) => {
						this.plugin.settings.mainNotesFolder = normalizeFolderPath(value);
						await this.plugin.saveSettings();
					});
				new FolderSuggest(this.app, text.inputEl);
			});
	}
}
