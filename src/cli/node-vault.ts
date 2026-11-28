import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { VaultReader } from './lint-cli';

/** A VaultReader over a folder on disk, or null if `vaultPath` isn't a folder. */
export function openNodeVault(vaultPath: string, cwd: string): VaultReader | null {
	const root = resolve(cwd, vaultPath);
	if (!isDirectory(root)) return null;
	const insideVault = (file: string) => {
		const rel = relative(root, file);
		return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
	};

	return {
		listMarkdown(folder) {
			const dir = join(root, folder);
			if (!isDirectory(dir)) return null;
			const found: string[] = [];
			walk(dir, folder, found);
			return found.sort();
		},
		read(path) {
			const file = join(root, path);
			return existsSync(file) && statSync(file).isFile() ? readFileSync(file, 'utf8') : null;
		},
		toVaultPath(path) {
			const fromCwd = resolve(cwd, path);
			const candidates = isAbsolute(path) ? [fromCwd] : [fromCwd, join(root, path)];
			const file = candidates.find((c) => insideVault(c) && existsSync(c)) ?? candidates.at(-1);
			if (file === undefined || !insideVault(file)) return null;
			return relative(root, file).split(sep).join('/');
		},
	};
}

function walk(dir: string, vaultDir: string, found: string[]): void {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('.')) continue;
		const vaultPath = vaultDir === '' ? entry.name : `${vaultDir}/${entry.name}`;
		if (entry.isDirectory()) walk(join(dir, entry.name), vaultPath, found);
		else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) found.push(vaultPath);
	}
}

function isDirectory(path: string): boolean {
	return existsSync(path) && statSync(path).isDirectory();
}
