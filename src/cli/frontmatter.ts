import { parse } from 'yaml';

const FRONTMATTER = /^---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

/**
 * The properties of a markdown file, read the way Obsidian does: a YAML block
 * between `---` lines at the very top. Missing, invalid or non-mapping YAML
 * means no properties.
 */
export function readProperties(markdown: string): Record<string, unknown> {
	const match = FRONTMATTER.exec(markdown.replace(/^\uFEFF/, ''));
	if (!match?.[1]) return {};
	try {
		const data: unknown = parse(match[1]);
		return data !== null && typeof data === 'object' && !Array.isArray(data)
			? (data as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}
