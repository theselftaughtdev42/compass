import { Plugin } from 'obsidian';
import { registerLint } from './commands/lint';
import { CompassSettings, CompassSettingTab, DEFAULT_SETTINGS } from './settings';

export default class CompassPlugin extends Plugin {
	settings!: CompassSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CompassSettingTab(this.app, this));
		registerLint(this);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<CompassSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
