import { App, normalizePath, PluginSettingTab, Setting } from 'obsidian';
import type CompassPlugin from './main';
import { FolderSuggest } from './ui/folder-suggest';

export interface CompassSettings {
	/** Vault-relative folder containing main notes (those with Folgezettel IDs). Empty = vault root. */
	mainNotesFolder: string;
}

export const DEFAULT_SETTINGS: CompassSettings = {
	mainNotesFolder: '',
};

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
