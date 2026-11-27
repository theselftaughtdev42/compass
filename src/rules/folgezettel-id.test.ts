import { describe, expect, it } from 'vitest';
import examples from '../../docs/spec/examples.json';
import {
	compareIds,
	FolgezettelId,
	formatId,
	lettersToValue,
	parseId,
	predecessorOf,
	requiredEarlierBranchOf,
	valueToLetters,
} from './folgezettel-id';

// Rule numbers refer to docs/spec/folgezettel-ids.md.

type Pair = [string, string | null];

function id(text: string): FolgezettelId {
	const parsed = parseId(text);
	if (!parsed) throw new Error(`Expected valid ID: ${text}`);
	return parsed;
}

function pred(text: string): string | null {
	const p = predecessorOf(id(text));
	return p ? formatId(p) : null;
}

describe('R1–R4 syntax', () => {
	it.each(examples.valid)('accepts $id ($rule) and round-trips', ({ id: text }) => {
		expect(formatId(id(text))).toBe(text);
	});

	it.each(examples.invalid)('rejects "$id" ($rule)', ({ id: text }) => {
		expect(parseId(text)).toBeNull();
	});

	it('R2: treats a multi-letter run as one segment', () => {
		expect(id('3aa').segments).toEqual([{ kind: 'letter', value: 27, dots: 0 }]);
	});

	it('R3: records dots on the segment they precede', () => {
		expect(id('3a..1').segments[1]).toEqual({ kind: 'number', value: 1, dots: 2 });
	});
});

describe('R5 letter values', () => {
	it.each(examples.letterValues as [string, number][])('%s ↔ %i', (letters, value) => {
		expect(lettersToValue(letters)).toBe(value);
		expect(valueToLetters(value)).toBe(letters);
	});
});

describe('R6 next note', () => {
	it.each(examples.next as Pair[])('%s → %s', (current, next) => {
		expect(pred(next ?? '')).toBe(current);
	});
});

describe('R7 branch', () => {
	it.each(examples.branch as Pair[])('%s → %s', (parent, branch) => {
		expect(pred(branch ?? '')).toBe(parent);
	});
});

describe('R9 branch order', () => {
	it.each(examples.requiredEarlierBranch as Pair[])('%s requires %s', (text, expected) => {
		const r = requiredEarlierBranchOf(id(text));
		expect(r ? formatId(r) : null).toBe(expected);
	});
});

describe('R10 predecessor', () => {
	it.each(examples.predecessor as Pair[])('%s → %s', (text, expected) => {
		expect(pred(text)).toBe(expected);
	});

	it('follows the lineage example', () => {
		const lineage: string[] = [];
		let current: string | null = examples.lineage[0] ?? null;
		while (current) {
			lineage.push(current);
			current = pred(current);
		}
		expect(lineage).toEqual(examples.lineage);
	});
});

describe('R11 sort order', () => {
	it.each(examples.sortOrder.map((order) => [order.join(', '), order]))(
		'%s',
		(_, order) => {
			const shuffled = [...order].reverse();
			expect(shuffled.map(id).sort(compareIds).map(formatId)).toEqual(order);
		},
	);
});
