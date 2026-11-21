# Compass

Compass helps keep a Folgezettel Zettelkasten in Obsidian in order: every main note has a place in a sequence, and that sequence follows fixed rules.

## Notes

**Main note**:
A fully formed note in the main notes folder. Every main note must carry a Folgezettel ID; notes outside the folder are never main notes, whatever their filename.
_Avoid_: Zettel, permanent note

**Topic head note**:
An optional main note whose ID is a bare root (e.g. `3`). It introduces a chain.

## Folgezettel IDs

**Folgezettel ID**:
The identifier that fixes a main note's position in the sequence, e.g. `3a.1b`.
_Avoid_: Zettel ID, note number, ID number

**Segment**:
One run of letters or digits inside a Folgezettel ID. After the root, segments alternate between letters and numbers. A letter segment may hold several letters (`aa` is one segment).

**Root**:
The first segment of a Folgezettel ID, always a number. It names the chain.

**Chain**:
All main notes whose IDs share the same root.
_Avoid_: Topic, tree

**Branch**:
A note that starts a new line of thought off an existing note by adding a segment to that note's ID (`3a` → `3a1`).
_Avoid_: Child, sub-note

**Dotted branch**:
An additional branch off the same parent. Each dot before the new segment counts one more additional branch (`3a.1` is the 2nd branch from `3a`, `3a..1` the 3rd). A dotted branch is only used once the branch with one fewer dot exists.

**Parent**:
The note a branch grows from.

**Predecessor**:
The note directly before a given note: its previous sibling if one exists, otherwise its parent. A bare root has no predecessor.
_Avoid_: Previous note

**Lineage**:
The run of predecessors from a note back to its root (`3a.2b → 3a.2a → 3a.2 → 3a.1 → 3a → 3`).
_Avoid_: Heritage, ancestry

**Previous link**:
A link in a main note's properties pointing to its predecessor, kept so Obsidian's graph shows sequences. It mirrors the ID and never overrides it.

**Chain 0**:
The catch-all chain (root `0`) for main notes that don't have a wider context yet.

## Lint issues

**Lint issue**:
A way a main note breaks the note rules. Sequence problems (orphan, skipped branch, duplicate ID, malformed ID) are one kind.
_Avoid_: Error, violation, sequence problem

**Skipped branch**:
A dotted branch whose branch with one fewer dot doesn't exist (e.g. `3a.1` with no `3a1`).

**Duplicate ID**:
Two or more main notes sharing the same Folgezettel ID.

**Previous link mismatch**:
A previous link that points somewhere other than the note's predecessor, including a note that has a previous link but no predecessor.

**Missing ID**:
A main note whose filename carries no Folgezettel ID.

**Missing previous link**:
A main note that has a predecessor but no previous link.

**Malformed ID**:
A Folgezettel ID that breaks the ID syntax rules (e.g. two letter segments in a row, uppercase letters).
_Avoid_: Invalid ID, bad ID

**Orphan**:
A main note with a well-formed ID whose predecessor doesn't exist (e.g. `1e2b` with no `1e2a`). A bare root never needs to exist, so a missing root alone doesn't make a note an orphan.
_Avoid_: Gap, missing note
