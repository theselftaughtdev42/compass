import { ItemView, setTooltip, WorkspaceLeaf } from 'obsidian';
import { LintReport, NoteGroup } from '../lint/report';

export const LINT_VIEW_TYPE = 'compass-lint';
export const LINT_ICON = 'list-checks';

/** The lint panel. It only renders reports it is given and never lints on its own. */
export class LintView extends ItemView {
	private report: LintReport | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly runLint: () => void,
	) {
		super(leaf);
	}

	getViewType(): string {
		return LINT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Lint';
	}

	getIcon(): string {
		return LINT_ICON;
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	setReport(report: LintReport): void {
		this.report = report;
		this.render();
	}

	private render(): void {
		const root = this.contentEl;
		root.empty();
		root.addClass('compass-lint');

		if (!this.report) {
			root.createDiv({ cls: 'compass-lint-empty', text: 'Not run yet' });
			const button = root.createEl('button', { cls: 'mod-cta', text: 'Run lint' });
			// Not registerDomEvent: the button goes away on the next render, and its listener with it.
			button.addEventListener('click', () => this.runLint());
			return;
		}

		root.createDiv({ cls: 'compass-lint-header', text: this.report.summary });
		if (this.report.unsortable.length > 0) {
			root.createDiv({ cls: 'compass-lint-section', text: 'Notes without a valid ID' });
			this.renderGroups(this.report.unsortable);
		}
		this.renderGroups(this.report.sorted);
	}

	private renderGroups(groups: NoteGroup[]): void {
		for (const group of groups) {
			const groupEl = this.contentEl.createDiv({ cls: 'compass-lint-group' });
			groupEl.createDiv({ cls: 'compass-lint-note', text: group.name });
			for (const issue of group.issues) {
				const line = groupEl.createDiv({ cls: 'compass-lint-issue' });
				line.createSpan({ cls: 'compass-lint-text', text: `${issue.name}: ${issue.detail}` });
				const badge = line.createSpan({ cls: 'compass-lint-rule', text: issue.rule });
				setTooltip(badge, issue.ruleSummary);
			}
		}
	}
}
