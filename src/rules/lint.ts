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
 * The ID is the text before the first `-`. With no `-`, the whole filename is
 * an ID if it parses (a title-less note), otherwise the note has no ID.
 */
export function idFromBasename(basename: string): IdText {
	const dash = basename.indexOf('-');
	const candidate = dash === -1 ? basename : basename.slice(0, dash);
	const id = parseId(candidate);
	if (id) return { status: 'ok', id };
	return dash === -1 ? { status: 'missing' } : { status: 'malformed' };
}

/**
 * Link target from a previous link value, stripped of alias, heading, folder
 * and `.md`. Null if there is no link.
 */
export function previousLinkTarget(value: unknown): string | null {
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

		const target = previousLinkTarget(note.previous);
		if (target === null) {
			const excused =
				predecessor === null || (predecessorMissing && isBareRoot(predecessor));
			if (!excused) issues.push({ kind: 'missing-previous-link', path: note.path });
		} else if (!linkMatchesPredecessor(target, predecessorKey, predecessorNotes)) {
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
