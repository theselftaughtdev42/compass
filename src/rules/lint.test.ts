import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import examples from '../../docs/spec/examples.json';
import {
	idFromBasename,
	LINT_ISSUE_NAMES,
	LintIssueKind,
	lintNotes,
	MainNoteInput,
	previousLinkTargets,
} from './lint';
import { LINT_RULE_IDS, LINT_RULE_SUMMARIES, LintRuleId } from './rule-ids';

/** Builds a note; `previous` is the raw property value, as in examples.json. */
function note(basename: string, previous?: unknown): MainNoteInput {
	return { path: `Main Notes/${basename}.md`, basename, previous };
}

const basenameOf = (path: string) => path.replace(/^Main Notes\/|\.md$/g, '');
const PATH_FIELDS = ['sharedWith', 'predecessorPaths', 'targetPaths'];

/** Lint issues as in examples.json: [basename, kind, details], paths as basenames. */
function lint(notes: MainNoteInput[]): [string, string, Record<string, unknown>][] {
	return lintNotes(notes).map(({ kind, rule, path, ...details }) => {
		expect(rule).toBe(LINT_RULE_IDS[kind]);
		const shown: Record<string, unknown> = { ...details };
		for (const field of PATH_FIELDS) {
			const paths = shown[field];
			if (Array.isArray(paths)) shown[field] = (paths as string[]).map(basenameOf);
		}
		return [basenameOf(path), kind, shown];
	});
}

// Rule numbers refer to docs/spec/folgezettel-ids.md.

describe('N1 filename', () => {
	it.each(examples.filenames)('%s → %s', (basename, status) => {
		expect(idFromBasename(basename).status).toBe(status);
	});
});

describe('N5 previous link value', () => {
	it.each(examples.previousLinks as [unknown, string[]][])('%j → %j', (value, expected) => {
		expect(previousLinkTargets(value)).toEqual(expected);
	});
});

describe('lintNotes', () => {
	interface LintExample {
		rule: string;
		name: string;
		notes: { basename: string; previous?: unknown }[];
		issues: unknown[];
	}
	it.each(examples.lint as LintExample[])('$rule: $name', ({ notes, issues }) => {
		expect(lint(notes.map((n) => note(n.basename, n.previous)))).toEqual(issues);
	});
});

describe('rule IDs', () => {
	const spec = readFileSync(new URL('../../docs/spec/folgezettel-ids.md', import.meta.url), 'utf8');
	const section = (rule: LintRuleId) =>
		spec.split(/^### /m).find((s) => s.startsWith(`${rule}. `)) ?? '';

	it.each(Object.entries(LINT_RULE_IDS) as [LintIssueKind, LintRuleId][])(
		'%s → %s, as the spec names it',
		(kind, rule) => {
			expect(section(rule).toLowerCase()).toContain(`*${LINT_ISSUE_NAMES[kind].toLowerCase()}*`);
		},
	);

	it.each(Object.values(LINT_RULE_IDS))('%s has a one-line summary', (rule) => {
		expect(LINT_RULE_SUMMARIES[rule]).toMatch(/^[^\n]+$/);
	});
});
