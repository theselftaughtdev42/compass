import { describe, expect, it } from 'vitest';
import { lintNotes, MainNoteInput } from '../rules/lint';
import { buildReport, countText, LintReport } from './report';

function note(basename: string, previous?: string | string[]): MainNoteInput {
	const link = (t: string) => `[[${t}]]`;
	return {
		path: `Main/${basename}.md`,
		basename,
		previous: Array.isArray(previous) ? previous.map(link) : previous && link(previous),
	};
}

function report(notes: MainNoteInput[]): LintReport {
	return buildReport(notes, lintNotes(notes));
}

/** Each group as [note name, ...issue lines], with the rule ID after `·`. */
function lines(r: LintReport): { unsortable: string[][]; sorted: string[][] } {
	const show = (groups: LintReport['sorted']) =>
		groups.map((g) => [g.name, ...g.issues.map((i) => `${i.name}: ${i.detail} · ${i.rule}`)]);
	return { unsortable: show(r.unsortable), sorted: show(r.sorted) };
}

describe('buildReport', () => {
	it('words every lint issue kind, with its rule ID', () => {
		const r = report([
			note('Loose'),
			note('3A-Bad'),
			note('3-Topic'),
			note('3a-A', '3-Topic'),
			note('3b-B', '3a-A'),
			note('3b-Other', '3a-A'),
			note('3c-C'),
			note('3e-E', '3d'),
			note('3c.1-Dotted', '3c-C'),
			note('3f-F', '3c-C'),
			note('4-Root', '3-Topic'),
		]);
		expect(lines(r)).toEqual({
			unsortable: [
				['3A-Bad', "Malformed ID: 3A isn't a valid Folgezettel ID · N1"],
				['Loose', "Missing ID: filename doesn't start with a Folgezettel ID · N1"],
			],
			sorted: [
				['3b-B', 'Duplicate ID: ID also used by 3b-Other · N2'],
				['3b-Other', 'Duplicate ID: ID also used by 3b-B · N2'],
				['3c-C', 'Missing previous link: should link to 3b-B or 3b-Other · N6'],
				['3c.1-Dotted', "Skipped branch: branch 3c1 doesn't exist yet · N4"],
				['3e-E', "Orphan: predecessor 3d doesn't exist · N3"],
				['3f-F', 'Previous link mismatch: links to 3c-C, should link to 3e-E · N7'],
				['4-Root', 'Previous link mismatch: links to 3-Topic, but a bare root has no predecessor · N7'],
			],
		});
	});

	it('names the predecessor ID when no note has it', () => {
		const r = report([note('3-Topic'), note('3a-A', '3-Topic'), note('3c-C')]);
		expect(lines(r).sorted).toEqual([
			[
				'3c-C',
				"Orphan: predecessor 3b doesn't exist · N3",
				'Missing previous link: should link to 3b · N6',
			],
		]);
	});

	it('lists every previous link target in a mismatch', () => {
		const r = report([note('3-Topic'), note('3a-A', ['3-Topic', 'Elsewhere'])]);
		expect(lines(r).sorted).toEqual([
			['3a-A', 'Previous link mismatch: links to 3-Topic and Elsewhere, should link to 3-Topic · N7'],
		]);
	});

	it('shows a duplicate ID under every note sharing it, naming the others', () => {
		const r = report([note('3-A'), note('3-B'), note('3-C')]);
		expect(lines(r).sorted).toEqual([
			['3-A', 'Duplicate ID: ID also used by 3-B and 3-C · N2'],
			['3-B', 'Duplicate ID: ID also used by 3-A and 3-C · N2'],
			['3-C', 'Duplicate ID: ID also used by 3-A and 3-B · N2'],
		]);
	});

	it('orders notes by Folgezettel ID (R11)', () => {
		const ids = ['10', '3aa', '9a', '3a.1', '3z', '3a1', '3a..1', '3a2', '3a'];
		// Every note is a duplicate, so each one has an issue.
		const notes = ids.flatMap((id) => [note(`${id}-X`), note(`${id}-Y`)]);
		const order = report(notes).sorted.map((g) => g.name.split('-')[0]);
		expect([...new Set(order)]).toEqual(['3a', '3a1', '3a2', '3a.1', '3a..1', '3z', '3aa', '9a', '10']);
	});

	it('puts issues within a note in rule order', () => {
		const r = report([note('3-A'), note('3-B'), note('3a.1-X'), note('3a.1-Y', 'Nowhere')]);
		const y = r.sorted.find((g) => g.name === '3a.1-Y');
		expect(y?.issues.map((i) => i.rule)).toEqual(['N2', 'N3', 'N4', 'N7']);
	});

	it('gives each issue its rule summary and an empty actions list', () => {
		const [issue] = report([note('Loose')]).unsortable[0]?.issues ?? [];
		expect(issue).toMatchObject({
			ruleSummary: "A main note's filename starts with a valid Folgezettel ID.",
			actions: [],
		});
	});

	it('counts lint issues and notes', () => {
		const r = report([note('3-A'), note('3-B'), note('3c-C')]);
		expect([r.issueCount, r.noteCount, r.summary]).toEqual([4, 3, '4 lint issues in 3 notes']);
	});

	it('says "No lint issues" when the folder is clean', () => {
		const r = report([note('3-Topic'), note('3a-A', '3-Topic')]);
		expect(r).toEqual({
			unsortable: [],
			sorted: [],
			issueCount: 0,
			noteCount: 0,
			summary: 'No lint issues',
		});
	});
});

describe('countText', () => {
	it.each([
		[0, 0, 'No lint issues'],
		[1, 1, '1 lint issue in 1 note'],
		[2, 1, '2 lint issues in 1 note'],
		[3, 2, '3 lint issues in 2 notes'],
	])('%i issues in %i notes → %s', (issues, notes, text) => {
		expect(countText(issues, notes)).toBe(text);
	});
});
