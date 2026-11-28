import { Notice } from 'obsidian';
import type CompassPlugin from '../main';
import { buildReport } from '../lint/report';
import { collectMainNotes } from '../lint/vault-notes';
import { lintNotes } from '../rules/lint';
import { LINT_ICON, LINT_VIEW_TYPE, LintView } from '../ui/lint-view';

export function registerLint(plugin: CompassPlugin): void {
	plugin.registerView(LINT_VIEW_TYPE, (leaf) => new LintView(leaf, () => void lintAllNotes(plugin)));

	plugin.addCommand({
		id: 'lint-all-notes',
		name: 'Lint all notes',
		callback: () => void lintAllNotes(plugin),
	});
	plugin.addCommand({
		id: 'open-lint-panel',
		name: 'Open lint panel',
		callback: () => void openLintPanel(plugin),
	});
	plugin.addRibbonIcon(LINT_ICON, 'Open lint panel', () => void openLintPanel(plugin));
}

/** Lints the main notes folder, shows the report in the lint panel and a count notice. */
export async function lintAllNotes(plugin: CompassPlugin): Promise<void> {
	const notes = collectMainNotes(plugin.app, plugin.settings.mainNotesFolder);
	const report = buildReport(notes, lintNotes(notes));
	new Notice(report.summary);
	(await openLintPanel(plugin))?.setReport(report);
}

/** Reveals the lint panel, opening it in the right sidebar if there isn't one. */
export async function openLintPanel(plugin: CompassPlugin): Promise<LintView | null> {
	const { workspace } = plugin.app;
	let leaf = workspace.getLeavesOfType(LINT_VIEW_TYPE)[0] ?? null;
	if (!leaf) {
		leaf = workspace.getRightLeaf(false);
		if (!leaf) return null;
		await leaf.setViewState({ type: LINT_VIEW_TYPE, active: true });
	}
	await workspace.revealLeaf(leaf);
	return leaf.view instanceof LintView ? leaf.view : null;
}
