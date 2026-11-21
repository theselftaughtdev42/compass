import { App, PluginSettingTab } from 'obsidian';
import type CompassPlugin from './main';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- placeholder until settings are added
export interface CompassSettings {}

export const DEFAULT_SETTINGS: CompassSettings = {};

export class CompassSettingTab extends PluginSettingTab {
	plugin: CompassPlugin;

	constructor(app: App, plugin: CompassPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
	}
}
