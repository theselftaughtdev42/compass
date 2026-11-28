/**
 * Spec rule IDs for each lint issue kind.
 * Source of truth: docs/spec/folgezettel-ids.md (note rules N1–N7).
 */

import type { LintIssueKind } from './lint';

export type LintRuleId = 'N1' | 'N2' | 'N3' | 'N4' | 'N6' | 'N7';

/** The note rule each lint issue kind breaks. */
export const LINT_RULE_IDS: Record<LintIssueKind, LintRuleId> = {
	'missing-id': 'N1',
	'malformed-id': 'N1',
	'duplicate-id': 'N2',
	orphan: 'N3',
	'skipped-branch': 'N4',
	'missing-previous-link': 'N6',
	'previous-link-mismatch': 'N7',
};

/** One-line summary of each rule, for the rule ID badge tooltip. */
export const LINT_RULE_SUMMARIES: Record<LintRuleId, string> = {
	N1: "A main note's filename starts with a valid Folgezettel ID.",
	N2: 'No two main notes share an ID.',
	N3: "A note's predecessor exists, unless the predecessor is a bare root.",
	N4: 'A dotted branch only exists once the branch with one fewer dot exists.',
	N6: 'Every note with a predecessor has a previous link.',
	N7: "A note's previous link points to its predecessor.",
};
