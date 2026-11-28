import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { openNodeVault } from './node-vault';

describe('openNodeVault', () => {
	it('rejects a folder without .obsidian', () => {
		expect(openNodeVault(mkdtempSync(join(tmpdir(), 'compass-plain-')), tmpdir())).toBeNull();
	});
});

describe('openNodeVault toVaultPath', () => {
	let root = '';
	beforeAll(() => {
		root = mkdtempSync(join(tmpdir(), 'compass-vault-'));
		mkdirSync(join(root, '.obsidian'));
		mkdirSync(join(root, 'Main'));
		writeFileSync(join(root, 'Main', '3a-A.md'), '');
	});

	it('resolves a path from the current folder', () => {
		const vault = openNodeVault('..', join(root, 'Main'));
		expect(vault?.toVaultPath('3a-A.md')).toBe('Main/3a-A.md');
	});

	it('falls back to the vault root', () => {
		const vault = openNodeVault(root, tmpdir());
		expect(vault?.toVaultPath('Main/3a-A.md')).toBe('Main/3a-A.md');
	});

	it('accepts an absolute path inside the vault', () => {
		const vault = openNodeVault(root, tmpdir());
		expect(vault?.toVaultPath(join(root, 'Main', '3a-A.md'))).toBe('Main/3a-A.md');
	});

	it('rejects a path outside the vault', () => {
		const vault = openNodeVault(root, tmpdir());
		expect(vault?.toVaultPath('../elsewhere.md')).toBeNull();
		expect(vault?.toVaultPath('/etc/hosts')).toBeNull();
	});
});
