/**
 * Lint checks for main notes.
 * Source of truth: docs/spec/folgezettel-ids.md (note rules N1–N7).
 */

import {
	FolgezettelId,
	formatId,
	isBareRoot,
	parseId,
	predecessorOf,
	requiredEarlierBranchOf,
} from './folgezettel-id';
import { LINT_RULE_IDS, LintRuleId } from './rule-ids';

export type LintIssueKind =
	| 'missing-id'
	| 'malformed-id'
	| 'duplicate-id'
	| 'orphan'
	| 'skipped-branch'
	| 'missing-previous-link'
	| 'previous-link-mismatch';

/** Each lint issue kind's glossary name, as shown to the user. */
export const LINT_ISSUE_NAMES: Record<LintIssueKind, string> = {
	'missing-id': 'Missing ID',
	'malformed-id': 'Malformed ID',
	'duplicate-id': 'Duplicate ID',
	orphan: 'Orphan',
	'skipped-branch': 'Skipped branch',
	'missing-previous-link': 'Missing previous link',
	'previous-link-mismatch': 'Previous link mismatch',
};

interface IssueBase<K extends LintIssueKind> {
	kind: K;
	/** Spec rule the issue breaks; always `LINT_RULE_IDS[kind]`. */
	rule: LintRuleId;
	/** Vault path of the main note with the issue. */
	path: string;
}

/**
 * A way one main note breaks the note rules, with the details needed to
 * explain it. IDs are in canonical form; note references are vault paths.
 */
export type LintIssue =
	| IssueBase<'missing-id'>
	| IssueBase<'malformed-id'>
	| (IssueBase<'duplicate-id'> & {
			/** The other main notes with the same ID. */
			sharedWith: string[];
	  })
	| (IssueBase<'orphan'> & {
			/** The predecessor that doesn't exist. */
			predecessorId: string;
	  })
	| (IssueBase<'skipped-branch'> & {
			/** The branch with one fewer dot that doesn't exist. */
			requiredBranchId: string;
	  })
	| (IssueBase<'missing-previous-link'> & {
			/** What the previous link should point to. */
			predecessorId: string;
			/** Main notes with the predecessor's ID; empty if it doesn't exist. */
			predecessorPaths: string[];
	  })
	| (IssueBase<'previous-link-mismatch'> & {
			/** What the previous link should point to; null for a bare root. */
			predecessorId: string | null;
			/** Main notes with the predecessor's ID; empty if it doesn't exist. */
			predecessorPaths: string[];
			/** Every previous link target, as read by N5: no alias, heading, folder or `.md`. */
			targets: string[];
			/** Main notes the targets resolve to; empty if none do. */
			targetPaths: string[];
	  });

type IssueOf<K extends LintIssueKind> = Extract<LintIssue, { kind: K }>;

function issue<K extends LintIssueKind>(
	kind: K,
	path: string,
	details: Omit<IssueOf<K>, 'kind' | 'rule' | 'path'>,
): IssueOf<K> {
	return { kind, rule: LINT_RULE_IDS[kind], path, ...details } as IssueOf<K>;
}

/** What the rules need to know about one main note. */
export interface MainNoteInput {
	path: string;
	/** Filename without extension, e.g. `3a.1b-Some title`. */
	basename: string;
	/** Raw `previous` frontmatter value, e.g. `"[[3a.1a-Other title]]"`. */
	previous: unknown;
}

type IdText =
	| { status: 'ok'; id: FolgezettelId }
	| { status: 'missing' }
	| { status: 'malformed' };

/**
 * The ID is the text before the first `-`, or the whole filename for a
 * title-less note. A filename starting with a digit is trying to carry an ID,
 * so if that ID doesn't parse it is malformed; any other filename has no ID.
 */
export function idFromBasename(basename: string): IdText {
	const dash = basename.indexOf('-');
	const candidate = dash === -1 ? basename : basename.slice(0, dash);
	const id = parseId(candidate);
	if (id) return { status: 'ok', id };
	return /^\d/.test(basename) ? { status: 'malformed' } : { status: 'missing' };
}

/**
 * Link targets from a `previous` value, each stripped of alias, heading,
 * folder and `.md`. Accepts a single link or a list of links, as Obsidian's
 * list property writes. Unquoted YAML `[[3a-A]]` parses as `[["3a-A"]]`, so a
 * one-item inner list counts as one link. Empty if there is no link.
 */
export function previousLinkTargets(value: unknown): string[] {
	const items = Array.isArray(value) ? (value as unknown[]) : [value];
	return items
		.map((item) => linkTarget(Array.isArray(item) && item.length === 1 ? item[0] : item))
		.filter((target): target is string => target !== null);
}

function linkTarget(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	let text = value.trim();
	const wiki = /^\[\[([^\]]*)\]\]$/.exec(text);
	if (wiki) text = wiki[1] ?? '';
	text = text.split('|')[0]?.split('#')[0]?.trim() ?? '';
	text = text.slice(text.lastIndexOf('/') + 1).replace(/\.md$/i, '');
	return text === '' ? null : text;
}

/** Lints every main note in `notes` against the others. */
export function lintNotes(notes: MainNoteInput[]): LintIssue[] {
	const issues: LintIssue[] = [];
	const parsed: { note: MainNoteInput; id: FolgezettelId; key: string }[] = [];
	const byId = new Map<string, MainNoteInput[]>();
	const byBasename = new Map<string, string[]>();

	for (const note of notes) {
		byBasename.set(note.basename, [...(byBasename.get(note.basename) ?? []), note.path]);
		const result = idFromBasename(note.basename);
		if (result.status === 'missing') {
			issues.push(issue('missing-id', note.path, {}));
		} else if (result.status === 'malformed') {
			issues.push(issue('malformed-id', note.path, {}));
		} else {
			const key = formatId(result.id);
			parsed.push({ note, id: result.id, key });
			byId.set(key, [...(byId.get(key) ?? []), note]);
		}
	}

	for (const { note, id, key } of parsed) {
		const notesWithId = byId.get(key) ?? [];
		if (notesWithId.length > 1) {
			const sharedWith = notesWithId.filter((n) => n !== note).map((n) => n.path);
			issues.push(issue('duplicate-id', note.path, { sharedWith }));
		}

		const predecessor = predecessorOf(id);
		const predecessorKey = predecessor ? formatId(predecessor) : null;
		const predecessorNotes = predecessorKey ? (byId.get(predecessorKey) ?? []) : [];
		const predecessorPaths = predecessorNotes.map((n) => n.path);
		const predecessorMissing = predecessor !== null && predecessorNotes.length === 0;

		if (predecessorKey !== null && predecessorMissing && !isBareRoot(predecessor)) {
			issues.push(issue('orphan', note.path, { predecessorId: predecessorKey }));
		}

		const earlierBranch = requiredEarlierBranchOf(id);
		const earlierBranchKey = earlierBranch ? formatId(earlierBranch) : null;
		if (earlierBranchKey !== null && !byId.has(earlierBranchKey)) {
			issues.push(issue('skipped-branch', note.path, { requiredBranchId: earlierBranchKey }));
		}

		const targets = previousLinkTargets(note.previous);
		const [target] = targets;
		if (target === undefined) {
			const excused =
				predecessorKey === null || (predecessorMissing && isBareRoot(predecessor));
			if (!excused) {
				issues.push(
					issue('missing-previous-link', note.path, {
						predecessorId: predecessorKey,
						predecessorPaths,
					}),
				);
			}
		} else if (
			// A note has one predecessor, so more than one previous link is a mismatch.
			targets.length > 1 ||
			!linkMatchesPredecessor(target, predecessorKey, predecessorNotes)
		) {
			const targetPaths = [...new Set(targets.flatMap((t) => byBasename.get(t) ?? []))];
			issues.push(
				issue('previous-link-mismatch', note.path, {
					predecessorId: predecessorKey,
					predecessorPaths,
					targets,
					targetPaths,
				}),
			);
		}
	}

	return issues;
}

function linkMatchesPredecessor(
	target: string,
	predecessorKey: string | null,
	predecessorNotes: MainNoteInput[],
): boolean {
	if (predecessorKey === null) return false;
	if (predecessorNotes.length > 0) {
		return predecessorNotes.some((n) => n.basename === target);
	}
	// Predecessor doesn't exist: the link can only mirror its ID.
	const linked = idFromBasename(target);
	return linked.status === 'ok' && formatId(linked.id) === predecessorKey;
}
