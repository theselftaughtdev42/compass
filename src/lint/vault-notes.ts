import { App } from 'obsidian';
import { MainNoteInput } from '../rules/lint';

/** Every markdown file in the main notes folder, with `previous` read from the metadata cache. */
export function collectMainNotes(app: App, mainNotesFolder: string): MainNoteInput[] {
	const prefix = mainNotesFolder === '' ? '' : `${mainNotesFolder}/`;
	return app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith(prefix))
		.map((file) => ({
			path: file.path,
			basename: file.basename,
			previous: (app.metadataCache.getFileCache(file)?.frontmatter as { previous?: unknown } | undefined)
				?.previous,
		}));
}
