import { DEFAULT_SETTINGS } from '../settings-defaults';
import { LINT_ISSUE_NAMES, lintNotes, LintIssue, MainNoteInput } from '../rules/lint';
import { readProperties } from './frontmatter';

/** Read access to one vault. All paths are vault-relative and use `/`. */
export interface VaultReader {
	/** Markdown files under `folder` (recursive, skipping dot folders), or null if it isn't a folder. */
	listMarkdown(folder: string): string[] | null;
	/** File contents, or null if the file doesn't exist. */
	read(path: string): string | null;
	/**
	 * A user-given note path as a vault path, or null if outside the vault. A relative
	 * path is tried from the current folder first, like `<vault>`, then from the vault root.
	 */
	toVaultPath(path: string): string | null;
}

export type LintCommand = 'notes' | 'note';

export interface CliResult {
	stdout: string[];
	stderr: string[];
	/** 0 clean, 1 lint issues found, 2 usage error. */
	exitCode: 0 | 1 | 2;
}

const SETTINGS_PATH = '.obsidian/plugins/compass/data.json';

const USAGE: Record<LintCommand, string> = {
	notes: 'Usage: npm run lint:notes -- <vault> [folder]',
	note: 'Usage: npm run lint:note -- <vault> <path>\n<path> is relative to the current folder, or else to the vault.',
};

/** Runs `lint:notes` or `lint:note`. `openVault` returns null if the path isn't an Obsidian vault. */
export function runLintCli(
	command: LintCommand,
	args: string[],
	openVault: (vaultPath: string) => VaultReader | null,
): CliResult {
	const [vaultPath, target, ...extra] = args;
	if (vaultPath === undefined || extra.length > 0 || (command === 'note' && target === undefined)) {
		return usageError(USAGE[command]);
	}
	const vault = openVault(vaultPath);
	if (!vault) return usageError(`Not an Obsidian vault (no .obsidian folder): "${vaultPath}"`);

	const folder =
		command === 'notes' && target !== undefined
			? normalizeFolder(target)
			: settingsFolder(vault);
	if (folder.split('/').includes('..')) {
		return usageError(`Main notes folder is outside the vault: "${folder}"`);
	}
	const paths = vault.listMarkdown(folder);
	if (!paths) return usageError(`Main notes folder not found: "${folder}"`);

	const notes = paths.map((path) => toInput(vault, path));
	let issues = lintNotes(notes);

	if (command === 'note') {
		const notePath = vault.toVaultPath(target ?? '');
		if (notePath === null || !paths.includes(notePath)) {
			return usageError(`Not a main note in "${folder || '/'}": "${target ?? ''}"`);
		}
		issues = issues.filter((issue) => issue.path === notePath);
	}

	return {
		stdout: [...issueLines(issues), countLine(issues)],
		stderr: [],
		exitCode: issues.length > 0 ? 1 : 0,
	};
}

function usageError(message: string): CliResult {
	return { stdout: [], stderr: [message], exitCode: 2 };
}

function normalizeFolder(folder: string): string {
	return folder.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

/** The main notes folder from the plugin's settings, else the default. */
function settingsFolder(vault: VaultReader): string {
	const raw = vault.read(SETTINGS_PATH);
	if (raw !== null) {
		try {
			const data: unknown = JSON.parse(raw);
			const folder = (data as { mainNotesFolder?: unknown } | null)?.mainNotesFolder;
			if (typeof folder === 'string') return normalizeFolder(folder);
		} catch {
			// Unreadable settings: Obsidian would fall back to defaults too.
		}
	}
	return DEFAULT_SETTINGS.mainNotesFolder;
}

function toInput(vault: VaultReader, path: string): MainNoteInput {
	const basename = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
	return { path, basename, previous: readProperties(vault.read(path) ?? '').previous };
}

function issueLines(issues: LintIssue[]): string[] {
	return [...issues]
		.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
		.map((issue) => `"${issue.path}": ${LINT_ISSUE_NAMES[issue.kind]}`);
}

function countLine(issues: LintIssue[]): string {
	if (issues.length === 0) return 'No lint issues';
	const notes = new Set(issues.map((issue) => issue.path)).size;
	return `${plural(issues.length, 'lint issue')} in ${plural(notes, 'note')}`;
}

function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
