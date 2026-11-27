/**
 * Folgezettel ID syntax and sequence rules.
 * Source of truth: docs/spec/folgezettel-ids.md (rule numbers R1–R11).
 */

export type SegmentKind = 'number' | 'letter';

export interface Segment {
	kind: SegmentKind;
	/** 1-based ordinal: `1` → 1, `a` → 1, `z` → 26, `aa` → 27. */
	value: number;
	/** Dots before the segment; each marks one more branch from the same parent. */
	dots: number;
}

export interface FolgezettelId {
	/** Chain number; `0` is the catch-all chain. */
	root: number;
	/** Segments after the root, alternating letter → number → letter. */
	segments: Segment[];
}

// Length caps (R1, R2) keep every value a safe integer.
const ROOT_PATTERN = /^(0|[1-9]\d{0,14})/;
const SEGMENT_PATTERN = /^(\.*)([a-z]{1,6}|[1-9]\d{0,14})/;

/** Parses an ID such as `3a.1b`. Returns null if it breaks the syntax rules. */
export function parseId(text: string): FolgezettelId | null {
	const rootMatch = ROOT_PATTERN.exec(text);
	if (!rootMatch) return null;
	const root = Number(rootMatch[0]);
	const segments: Segment[] = [];
	let rest = text.slice(rootMatch[0].length);
	let expected: SegmentKind = 'letter';

	while (rest.length > 0) {
		const match = SEGMENT_PATTERN.exec(rest);
		if (!match) return null;
		const dots = match[1] ?? '';
		const body = match[2] ?? '';
		const kind: SegmentKind = /\d/.test(body.charAt(0)) ? 'number' : 'letter';
		if (kind !== expected) return null;
		segments.push({
			kind,
			value: kind === 'number' ? Number(body) : lettersToValue(body),
			dots: dots.length,
		});
		rest = rest.slice(match[0].length);
		expected = kind === 'letter' ? 'number' : 'letter';
	}
	return { root, segments };
}

export function formatId(id: FolgezettelId): string {
	return (
		String(id.root) +
		id.segments
			.map(
				(s) =>
					'.'.repeat(s.dots) +
					(s.kind === 'number' ? String(s.value) : valueToLetters(s.value)),
			)
			.join('')
	);
}

export function isBareRoot(id: FolgezettelId): boolean {
	return id.segments.length === 0;
}

/**
 * The note directly before this one: previous sibling if the last segment
 * isn't its first value, otherwise the parent. A bare root has none.
 */
export function predecessorOf(id: FolgezettelId): FolgezettelId | null {
	const last = id.segments[id.segments.length - 1];
	if (!last) return null;
	const head = id.segments.slice(0, -1);
	if (last.value > 1) {
		return { root: id.root, segments: [...head, { ...last, value: last.value - 1 }] };
	}
	return { root: id.root, segments: head };
}

/**
 * For a dotted branch's first note (e.g. `3a.1`), the branch with one fewer
 * dot that must exist first (`3a1`). Null otherwise.
 */
export function requiredEarlierBranchOf(id: FolgezettelId): FolgezettelId | null {
	const last = id.segments[id.segments.length - 1];
	if (!last || last.dots === 0 || last.value !== 1) return null;
	return {
		root: id.root,
		segments: [...id.segments.slice(0, -1), { ...last, dots: last.dots - 1 }],
	};
}

/** Depth-first order, dotted branches after undotted ones, letters by value. */
export function compareIds(a: FolgezettelId, b: FolgezettelId): number {
	if (a.root !== b.root) return a.root - b.root;
	const length = Math.min(a.segments.length, b.segments.length);
	for (let i = 0; i < length; i++) {
		const sa = a.segments[i];
		const sb = b.segments[i];
		if (!sa || !sb) break;
		if (sa.dots !== sb.dots) return sa.dots - sb.dots;
		if (sa.value !== sb.value) return sa.value - sb.value;
	}
	return a.segments.length - b.segments.length;
}

/** Spreadsheet-column style: `a` → 1, `z` → 26, `aa` → 27. */
export function lettersToValue(letters: string): number {
	let value = 0;
	for (const char of letters) {
		value = value * 26 + (char.charCodeAt(0) - 96);
	}
	return value;
}

export function valueToLetters(value: number): string {
	let letters = '';
	let n = value;
	while (n > 0) {
		const remainder = (n - 1) % 26;
		letters = String.fromCharCode(97 + remainder) + letters;
		n = Math.floor((n - 1) / 26);
	}
	return letters;
}
