/** Settings shape and defaults, kept free of `obsidian` imports so the CLI can use them. */
export interface CompassSettings {
	/** Vault-relative folder containing main notes (those with Folgezettel IDs). Empty = vault root. */
	mainNotesFolder: string;
}

export const DEFAULT_SETTINGS: CompassSettings = {
	mainNotesFolder: '',
};
