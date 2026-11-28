import { describe, expect, it } from 'vitest';
import { runLintCli, VaultReader } from './lint-cli';

/** An in-memory vault: vault path → contents. */
function memoryVault(files: Record<string, string>): VaultReader {
	return {
		listMarkdown(folder) {
			const prefix = folder === '' ? '' : `${folder}/`;
			const inFolder = Object.keys(files).filter(
				(p) => p.startsWith(prefix) && p.endsWith('.md') && !p.split('/').some((s) => s.startsWith('.')),
			);
			const isFolder = folder === '' || Object.keys(files).some((p) => p.startsWith(prefix));
			return isFolder ? inFolder.sort() : null;
		},
		read: (path) => files[path] ?? null,
		toVaultPath: (path) => (path.startsWith('/') ? null : path),
	};
}

const link = (target: string) => `---\nprevious: "[[${target}]]"\n---\n`;
const settings = (folder: string) => JSON.stringify({ mainNotesFolder: folder });

const vault = memoryVault({
	'.obsidian/plugins/compass/data.json': settings('Main'),
	'Main/3-Topic.md': '# Topic',
	'Main/3a-A.md': link('3-Topic'),
	'Main/3b-B.md': link('3a-A'),
	'Main/3d-D.md': link('3c-C'),
	'Main/Loose.md': '',
	'Inbox/Idea.md': '',
});
const open = (v: VaultReader) => (path: string) => (path === 'vault' ? v : null);

describe('lint:notes', () => {
	it('lints the folder from the plugin settings', () => {
		const result = runLintCli('notes', ['vault'], open(vault));
		expect(result.stdout).toEqual([
			'"Main/3d-D.md": Orphan',
			'"Main/Loose.md": Missing ID',
			'2 lint issues in 2 notes',
		]);
		expect(result.exitCode).toBe(1);
	});

	it('lints a folder given on the command line', () => {
		const result = runLintCli('notes', ['vault', 'Inbox/'], open(vault));
		expect(result.stdout).toEqual(['"Inbox/Idea.md": Missing ID', '1 lint issue in 1 note']);
	});

	it('exits 0 with "No lint issues" when clean', () => {
		const clean = memoryVault({ '3-Topic.md': '', '3a-A.md': link('3-Topic') });
		const result = runLintCli('notes', ['vault'], open(clean));
		expect(result).toEqual({ stdout: ['No lint issues'], stderr: [], exitCode: 0 });
	});

	it('defaults to the vault root without settings', () => {
		const noSettings = memoryVault({ 'Main/3a-A.md': '', '.obsidian/x.md': '' });
		const result = runLintCli('notes', ['vault'], open(noSettings));
		expect(result.stdout).toEqual(['No lint issues']);
	});

	it('counts several issues on one note once in the note count', () => {
		const v = memoryVault({ '3b-B.md': link('3x-X'), '3b-Other.md': '' });
		const result = runLintCli('notes', ['vault'], open(v));
		expect(result.stdout).toEqual([
			'"3b-B.md": Duplicate ID',
			'"3b-B.md": Orphan',
			'"3b-B.md": Previous link mismatch',
			'"3b-Other.md": Duplicate ID',
			'"3b-Other.md": Orphan',
			'"3b-Other.md": Missing previous link',
			'6 lint issues in 2 notes',
		]);
	});
});

describe('lint:note', () => {
	it('shows only the note’s issues, including cross-note ones', () => {
		const result = runLintCli('note', ['vault', 'Main/3d-D.md'], open(vault));
		expect(result.stdout).toEqual(['"Main/3d-D.md": Orphan', '1 lint issue in 1 note']);
		expect(result.exitCode).toBe(1);
	});

	it('lints a main note without an ID', () => {
		const result = runLintCli('note', ['vault', 'Main/Loose.md'], open(vault));
		expect(result.stdout[0]).toBe('"Main/Loose.md": Missing ID');
	});

	it('exits 0 for a clean note', () => {
		const result = runLintCli('note', ['vault', 'Main/3b-B.md'], open(vault));
		expect(result.stdout).toEqual(['No lint issues']);
		expect(result.exitCode).toBe(0);
	});

	it.each([
		['outside the main notes folder', 'Inbox/Idea.md'],
		['missing', 'Main/3z-Z.md'],
		['outside the vault', '/etc/passwd'],
	])('is a usage error for a note %s', (_, path) => {
		const result = runLintCli('note', ['vault', path], open(vault));
		expect(result.exitCode).toBe(2);
		expect(result.stdout).toEqual([]);
		expect(result.stderr[0]).toMatch(/Not a main note/);
	});
});

describe('usage errors', () => {
	it.each([
		['notes', []],
		['notes', ['vault', 'Main', 'extra']],
		['note', ['vault']],
	] as const)('%s with %j', (command, args) => {
		const result = runLintCli(command, [...args], open(vault));
		expect(result.exitCode).toBe(2);
		expect(result.stderr[0]).toMatch(/^Usage:/);
	});

	it('reports a missing vault', () => {
		expect(runLintCli('notes', ['nope'], open(vault)).stderr).toEqual(['Vault not found: "nope"']);
	});

	it.each([['../'], ['Main/../../other']])('rejects a folder outside the vault: %s', (folder) => {
		const result = runLintCli('notes', ['vault', folder], open(vault));
		expect(result.exitCode).toBe(2);
		expect(result.stderr[0]).toMatch(/outside the vault/);
	});

	it('rejects a settings folder outside the vault', () => {
		const v = memoryVault({ '.obsidian/plugins/compass/data.json': settings('../x') });
		expect(runLintCli('notes', ['vault'], open(v)).exitCode).toBe(2);
	});

	it('reports a missing folder', () => {
		const result = runLintCli('notes', ['vault', 'Nope'], open(vault));
		expect(result).toMatchObject({ exitCode: 2, stderr: ['Main notes folder not found: "Nope"'] });
	});
});
