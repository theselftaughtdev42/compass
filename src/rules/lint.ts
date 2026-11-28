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

export interface LintIssue {
	kind: LintIssueKind;
	/** Vault path of the main note with the issue. */
	path: string;
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

	for (const note of notes) {
		const result = idFromBasename(note.basename);
		if (result.status === 'missing') {
			issues.push({ kind: 'missing-id', path: note.path });
		} else if (result.status === 'malformed') {
			issues.push({ kind: 'malformed-id', path: note.path });
		} else {
			const key = formatId(result.id);
			parsed.push({ note, id: result.id, key });
			byId.set(key, [...(byId.get(key) ?? []), note]);
		}
	}

	for (const { note, id, key } of parsed) {
		if ((byId.get(key)?.length ?? 0) > 1) {
			issues.push({ kind: 'duplicate-id', path: note.path });
		}

		const predecessor = predecessorOf(id);
		const predecessorKey = predecessor ? formatId(predecessor) : null;
		const predecessorNotes = predecessorKey ? (byId.get(predecessorKey) ?? []) : [];
		const predecessorMissing = predecessor !== null && predecessorNotes.length === 0;

		if (predecessorMissing && !isBareRoot(predecessor)) {
			issues.push({ kind: 'orphan', path: note.path });
		}

		const earlierBranch = requiredEarlierBranchOf(id);
		if (earlierBranch && !byId.has(formatId(earlierBranch))) {
			issues.push({ kind: 'skipped-branch', path: note.path });
		}

		const targets = previousLinkTargets(note.previous);
		const [target] = targets;
		if (target === undefined) {
			const excused =
				predecessor === null || (predecessorMissing && isBareRoot(predecessor));
			if (!excused) issues.push({ kind: 'missing-previous-link', path: note.path });
		} else if (
			// A note has one predecessor, so more than one previous link is a mismatch.
			targets.length > 1 ||
			!linkMatchesPredecessor(target, predecessorKey, predecessorNotes)
		) {
			issues.push({ kind: 'previous-link-mismatch', path: note.path });
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
