import { describe, expect, it } from 'vitest';
import examples from '../../docs/spec/examples.json';
import { idFromBasename, lintNotes, MainNoteInput, previousLinkTargets } from './lint';

/** Builds a note; `previous` is the raw property value, as in examples.json. */
function note(basename: string, previous?: unknown): MainNoteInput {
	return { path: `Main Notes/${basename}.md`, basename, previous };
}

function kinds(notes: MainNoteInput[]): [string, string][] {
	return lintNotes(notes).map((i) => [i.path.replace(/^Main Notes\/|\.md$/g, ''), i.kind]);
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
	it.each(examples.lint)('$rule: $name', ({ notes, issues }) => {
		expect(kinds(notes.map((n) => note(n.basename, n.previous)))).toEqual(issues);
	});
});
