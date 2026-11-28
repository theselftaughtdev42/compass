/**
 * The lint panel's view model, built from lint issues. Pure, so the panel,
 * the notice and the lint scripts all read the same text.
 */

import { compareIds, FolgezettelId } from '../rules/folgezettel-id';
import { idFromBasename, LINT_ISSUE_NAMES, LintIssue, LintIssueKind, MainNoteInput } from '../rules/lint';
import { LINT_RULE_SUMMARIES, LintRuleId } from '../rules/rule-ids';

/** A fix the panel can offer for a lint issue. None exist yet (#6). */
export type LintAction = never;

export interface ReportIssue {
	kind: LintIssueKind;
	/** Glossary name, e.g. `Orphan`. */
	name: string;
	/** What is wrong, e.g. `predecessor 3b doesn't exist`. */
	detail: string;
	rule: LintRuleId;
	ruleSummary: string;
	actions: LintAction[];
}

export interface NoteGroup {
	/** Vault path of the main note. */
	path: string;
	/** Filename without extension. */
	name: string;
	issues: ReportIssue[];
}

export interface LintReport {
	/** Notes with a missing or malformed ID, which can't be placed in the sequence. */
	unsortable: NoteGroup[];
	/** Notes with a valid ID, in Folgezettel order (R11). */
	sorted: NoteGroup[];
	issueCount: number;
	noteCount: number;
	/** "N lint issues in M notes", or "No lint issues". */
	summary: string;
}

const RULE_ORDER = Object.keys(LINT_RULE_SUMMARIES) as LintRuleId[];
const KIND_ORDER = Object.keys(LINT_ISSUE_NAMES) as LintIssueKind[];

/** Builds the report for `issues`, found by linting `notes`. */
export function buildReport(notes: MainNoteInput[], issues: LintIssue[]): LintReport {
	const basenames = new Map(notes.map((n) => [n.path, n.basename]));
	const nameOf = (path: string) => basenames.get(path) ?? basenameOf(path);

	const byPath = new Map<string, LintIssue[]>();
	for (const issue of issues) byPath.set(issue.path, [...(byPath.get(issue.path) ?? []), issue]);

	const unsortable: NoteGroup[] = [];
	const sorted: { group: NoteGroup; id: FolgezettelId }[] = [];
	for (const [path, noteIssues] of byPath) {
		const name = nameOf(path);
		const group: NoteGroup = {
			path,
			name,
			issues: [...noteIssues].sort(byRule).map((issue) => reportIssue(issue, nameOf)),
		};
		const id = idFromBasename(name);
		if (id.status === 'ok') sorted.push({ group, id: id.id });
		else unsortable.push(group);
	}

	unsortable.sort((a, b) => compareText(a.path, b.path));
	sorted.sort((a, b) => compareIds(a.id, b.id) || compareText(a.group.path, b.group.path));

	return {
		unsortable,
		sorted: sorted.map((s) => s.group),
		issueCount: issues.length,
		noteCount: byPath.size,
		summary: countText(issues.length, byPath.size),
	};
}

/** "N lint issues in M notes", or "No lint issues". */
export function countText(issueCount: number, noteCount: number): string {
	if (issueCount === 0) return 'No lint issues';
	return `${plural(issueCount, 'lint issue')} in ${plural(noteCount, 'note')}`;
}

function reportIssue(issue: LintIssue, nameOf: (path: string) => string): ReportIssue {
	return {
		kind: issue.kind,
		name: LINT_ISSUE_NAMES[issue.kind],
		detail: detailOf(issue, nameOf),
		rule: issue.rule,
		ruleSummary: LINT_RULE_SUMMARIES[issue.rule],
		actions: [],
	};
}

function detailOf(issue: LintIssue, nameOf: (path: string) => string): string {
	const names = (paths: string[]) => paths.map(nameOf);
	switch (issue.kind) {
		case 'missing-id':
			return "filename doesn't start with a Folgezettel ID";
		case 'malformed-id':
			return `${idCandidate(nameOf(issue.path))} isn't a valid Folgezettel ID`;
		case 'duplicate-id':
			return `ID also used by ${list(names(issue.sharedWith), 'and')}`;
		case 'orphan':
			return `predecessor ${issue.predecessorId} doesn't exist`;
		case 'skipped-branch':
			return `branch ${issue.requiredBranchId} doesn't exist yet`;
		case 'missing-previous-link':
			return `should link to ${expected(issue.predecessorId, names(issue.predecessorPaths))}`;
		case 'previous-link-mismatch': {
			const linksTo = `links to ${list(issue.targets, 'and')}`;
			if (issue.predecessorId === null) return `${linksTo}, but a bare root has no predecessor`;
			return `${linksTo}, should link to ${expected(issue.predecessorId, names(issue.predecessorPaths))}`;
		}
	}
}

/** The existing predecessor notes, or else the predecessor's ID. */
function expected(predecessorId: string, predecessorNames: string[]): string {
	return predecessorNames.length > 0 ? list(predecessorNames, 'or') : predecessorId;
}

/** The ID part of a filename: the text before the first `-`. */
function idCandidate(basename: string): string {
	const dash = basename.indexOf('-');
	return dash === -1 ? basename : basename.slice(0, dash);
}

function list(items: string[], conjunction: 'and' | 'or'): string {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1] ?? ''}`;
}

function byRule(a: LintIssue, b: LintIssue): number {
	return (
		RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule) ||
		KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
	);
}

function basenameOf(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
}

function compareText(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

function plural(count: number, noun: string): string {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
