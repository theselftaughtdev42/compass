import { describe, expect, it } from 'vitest';
import { previousLinkTargets } from '../rules/lint';
import { readProperties } from './frontmatter';

describe('readProperties', () => {
	it('reads a quoted string previous link', () => {
		const props = readProperties('---\nprevious: "[[3a-A]]"\n---\n# B\n');
		expect(previousLinkTargets(props.previous)).toEqual(['3a-A']);
	});

	it('reads a list previous link', () => {
		const props = readProperties('---\nprevious:\n  - "[[3a-A]]"\n---\n');
		expect(previousLinkTargets(props.previous)).toEqual(['3a-A']);
	});

	it('reads an unquoted wiki link the way YAML parses it', () => {
		const props = readProperties('---\nprevious: [[3a-A]]\n---\n');
		expect(previousLinkTargets(props.previous)).toEqual(['3a-A']);
	});

	it('handles CRLF line endings and a BOM', () => {
		const props = readProperties('\uFEFF---\r\nprevious: "[[3a-A]]"\r\n---\r\nBody');
		expect(previousLinkTargets(props.previous)).toEqual(['3a-A']);
	});

	it('has no properties without frontmatter', () => {
		expect(readProperties('# Title\n\nprevious: "[[3a-A]]"')).toEqual({});
	});

	it('has no properties for empty, invalid or non-mapping YAML', () => {
		expect(readProperties('---\n---\n')).toEqual({});
		expect(readProperties('---\nprevious: [unclosed\n---\n')).toEqual({});
		expect(readProperties('---\n- a\n- b\n---\n')).toEqual({});
	});

	it('ignores a --- block that is not at the top', () => {
		expect(readProperties('# T\n---\nprevious: "[[3a-A]]"\n---\n')).toEqual({});
	});
});
