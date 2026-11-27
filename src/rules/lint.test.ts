import { describe, expect, it } from 'vitest';
import { idFromBasename, lintNotes, MainNoteInput, previousLinkTarget } from './lint';

/** Builds a note; `previous` is the predecessor basename or undefined. */
function note(basename: string, previous?: string): MainNoteInput {
	return {
		path: `Main Notes/${basename}.md`,
		basename,
		previous: previous === undefined ? undefined : `[[${previous}]]`,
	};
}

function kinds(notes: MainNoteInput[]): [string, string][] {
	return lintNotes(notes).map((i) => [i.path.replace(/^Main Notes\/|\.md$/g, ''), i.kind]);
}

describe('idFromBasename', () => {
	it.each([
		['3a-Title', 'ok'],
		['3a-Title - with dash', 'ok'],
		['3', 'ok'],
		['3A-Title', 'malformed'],
		['Some note-with dash', 'malformed'],
		['Some note', 'missing'],
	])('%s → %s', (basename, status) => {
		expect(idFromBasename(basename).status).toBe(status);
	});
});

describe('previousLinkTarget', () => {
	it.each([
		['[[3a-Title]]', '3a-Title'],
		['[[3a-Title|alias]]', '3a-Title'],
		['[[3a-Title#Heading]]', '3a-Title'],
		['[[Main Notes/3a-Title.md]]', '3a-Title'],
		['3a-Title', '3a-Title'],
		['', null],
		['[[]]', null],
		[undefined, null],
		[null, null],
		[['[[3a-Title]]'], null],
	])('%j → %j', (value, expected) => {
		expect(previousLinkTarget(value)).toBe(expected);
	});
});

describe('lintNotes', () => {
	it('passes a well-formed sequence', () => {
		expect(
			kinds([
				note('3-Head'),
				note('3a-A', '3-Head'),
				note('3a1-A1', '3a-A'),
				note('3a.1-A dot 1', '3a-A'),
				note('3b-B', '3a-A'),
			]),
		).toEqual([]);
	});

	it('flags missing and malformed IDs', () => {
		expect(kinds([note('Unfinished'), note('3A-Upper')])).toEqual([
			['Unfinished', 'missing-id'],
			['3A-Upper', 'malformed-id'],
		]);
	});

	it('flags every note sharing an ID', () => {
		expect(kinds([note('3a-One'), note('3a-Two')])).toEqual([
			['3a-One', 'duplicate-id'],
			['3a-Two', 'duplicate-id'],
		]);
	});

	it('flags an orphan whose predecessor is missing', () => {
		expect(kinds([note('3a-A'), note('3c-C', '3b-B')])).toEqual([['3c-C', 'orphan']]);
	});

	it('does not treat a missing bare root as orphaning', () => {
		expect(kinds([note('3a-A')])).toEqual([]);
	});

	it('flags a skipped branch', () => {
		expect(kinds([note('3a-A'), note('3a.1-Dot', '3a-A')])).toEqual([
			['3a.1-Dot', 'skipped-branch'],
		]);
	});

	it('flags a missing previous link', () => {
		expect(kinds([note('3a-A'), note('3b-B')])).toEqual([['3b-B', 'missing-previous-link']]);
	});

	it('requires a previous link on the first note when the topic head exists', () => {
		expect(kinds([note('3-Head'), note('3a-A')])).toEqual([['3a-A', 'missing-previous-link']]);
	});

	it('does not require a previous link on a bare root', () => {
		expect(kinds([note('3-Head')])).toEqual([]);
	});

	it('flags a previous link pointing to the wrong note', () => {
		expect(kinds([note('3a-A'), note('3b-B'), note('3c-C', '3a-A')])).toEqual([
			['3b-B', 'missing-previous-link'],
			['3c-C', 'previous-link-mismatch'],
		]);
	});

	it('flags a previous link on a note with no predecessor', () => {
		expect(kinds([note('3-Head', '2-Other')])).toEqual([['3-Head', 'previous-link-mismatch']]);
	});

	it('accepts a link mirroring the ID of a missing predecessor', () => {
		expect(kinds([note('3a-A', '3-Head')])).toEqual([]);
		expect(kinds([note('3c-C', '3b-Gone')])).toEqual([['3c-C', 'orphan']]);
	});
});
