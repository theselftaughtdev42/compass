# Folgezettel ID notation

Status: draft. Working name until the notation has a proper one.

This is the source of truth for the syntax and sequence rules of Folgezettel IDs (R1–R11) and for the note rules that lint checks main notes against (N1–N7). Terms follow `GLOSSARY.md`. Every example is also in [`examples.json`](examples.json), which the test suite runs, so the examples here cannot drift from the code. If you change a rule, update both files.

The key words MUST, MUST NOT and MAY are used as in RFC 2119.

## 1. Syntax

### Grammar (EBNF)

```ebnf
id           = root , [ letter-part ] ;
letter-part  = dots , letters , [ number-part ] ;
number-part  = dots , number , [ letter-part ] ;

root         = "0" | number ;
number       = nonzero-digit , { digit } ;
letters      = lower , { lower } ;
dots         = { "." } ;

nonzero-digit = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
digit         = "0" | nonzero-digit ;
lower         = "a" | "b" | … | "z" ;
```

`letter-part` and `number-part` call each other, which is how the grammar enforces alternation.

### R1. Root

The first segment is the **root**: a number that names the chain. It MUST NOT have leading zeros and MUST have at most 15 digits. `0` is allowed and names chain 0.

A bare root (e.g. `3`) is a topic head note. It is optional.

### R2. Alternating segments

After the root, segments alternate letter → number → letter …, starting with a letter. No separator is needed because each segment changes type.

- A **letter segment** is one or more lowercase letters `a`–`z`. Letters MUST be lowercase: `3A`, `3Ab` and `3aB` are invalid, never read as `3a` or `3ab`. A run of letters is always one segment: `aa` is one segment, not two. A letter segment has at most 6 letters.
- A **number segment** is a positive integer with no leading zeros. `0` is not a valid number segment. A number segment has at most 15 digits.

### R3. Dots

Any segment after the root MAY be preceded by one or more dots. Dots MUST NOT appear before the root or at the end of an ID.

### R4. Canonical form

Each ID has exactly one spelling. Two IDs are the same ID only if their text is identical.

Invalid examples: `""`, `a`, `03`, `3A`, `3a01`, `3a0`, `3a.`, `.3a`, `3a-1`, `3a 1`, `1234567890123456` (16 digits), `3abcdefg` (7 letters).

## 2. Segment values

### R5. Values

Every segment after the root has a 1-based value. The first value of each type is `1` or `a`.

- Number segments count in decimal with no roll-over: `9` → `10`.
- Letter segments count like spreadsheet columns: `a`–`z` is 1–26, then `aa` (27) … `az` (52), `ba` (53) … `zz` (702), `aaa` (703).

## 3. Sequence

### R6. Next note

Incrementing the last segment gives the next note in the sequence: `3a` → `3b`, `3a1` → `3a2`, `3z` → `3aa`.

### R7. Branch

Appending a segment of the next type with its first value branches off a note: `3a` → `3a1`, `3a1` → `3a1a`.

### R8. Dotted branch

Dots only ever mean "nth branch". A segment with *n* dots starts the (*n* + 1)th branch from the same parent:

| ID      | Meaning              |
| ------- | -------------------- |
| `3a1`   | 1st branch from `3a` |
| `3a.1`  | 2nd branch from `3a` |
| `3a..1` | 3rd branch from `3a` |

### R9. Branch order

The first note of a dotted branch (last segment has *n* > 0 dots and its first value) MUST only exist once the branch with *n* − 1 dots exists: `3a.1` requires `3a1`, and `3a..1` requires `3a.1`. Breaking this is a *skipped branch*.

Later notes in a dotted branch (`3a.2`) have no such requirement; R10 covers them.

### R10. Predecessor

- If the last segment is not its first value, decrement it, keeping its dots: `3a.2` → `3a.1`.
- Otherwise remove it along with its dots to get the parent: `3a..1` → `3a`.
- A bare root has no predecessor.

The **lineage** is the run of predecessors back to the root:

`3a.2b → 3a.2a → 3a.2 → 3a.1 → 3a → 3`

## 4. Order

### R11. Sort order

IDs sort depth-first. Compare roots by number, then segments position by position:

1. fewer dots first;
2. then lower value first (letters by value, not alphabetically);
3. if one ID is a prefix of the other, the shorter one comes first.

`3, 3a, 3a1, 3a2, 3a.1, 3a.2, 3a..1, 3b`

Letters sort by value: `3z` comes before `3aa`. Roots sort by number: `9a` comes before `10`.

## 5. Note rules

These rules apply to main notes. Each one that a note breaks is a lint issue, named as in `GLOSSARY.md`. One note can have several issues. A note with a missing or malformed ID gets no other issues, because the other rules need its ID.

### N1. Filename

A main note's filename (without `.md`) is `<id>-<title>`, or just `<id>` for a note with no title. The ID is the text before the first `-`; the title MAY contain more dashes (`3a-Title - with dash`).

- If that text is a valid ID (R1–R4), the note has that ID.
- Otherwise, if the filename starts with a digit, it is trying to carry an ID: *malformed ID* (`3A-Title`, `3A`, `03`, `3a.`).
- Otherwise the note has no ID: *missing ID* (`Some note`, `Some note-with dash`, `-Title`).

### N2. Unique IDs

No two main notes MAY share an ID (R4). Every note that shares one is a *duplicate ID*.

### N3. Predecessor exists

A note's predecessor (R10) MUST exist, or it is an *orphan*: `3c` with no `3b`. A bare root is optional (R1), so a missing topic head note never makes a note an orphan.

### N4. Branch order

A note that breaks R9 is a *skipped branch*: `3a.1` with no `3a1`.

### N5. Previous link value

A note's previous link is its `previous` property. Lint reads the link target from:

- a wikilink, ignoring any alias, heading, folder and `.md`: `[[Main Notes/3a-Title.md|alias]]` → `3a-Title`;
- plain text: `3a-Title`;
- a list of either, as Obsidian's list property writes. Unquoted YAML `previous: [[3a-Title]]` parses as a list holding a list, which counts as one link.

An empty value, an empty link (`[[]]`) and anything other than text or a list count as no link.

### N6. Previous link required

Every note with a predecessor MUST have a previous link, or it is a *missing previous link*. Excused:

- a bare root, which has no predecessor;
- a note whose predecessor is a bare root that doesn't exist (`3a` or `3.a` with no `3`).

For apps like Obsidian, this ensures the graph view displays correct connections.

### N7. Previous link matches

A previous link MUST point to the note's predecessor, or it is a *previous link mismatch*:

- If the predecessor exists, the link MUST match its filename exactly.
- If the predecessor doesn't exist, the link MUST carry the predecessor's ID (`[[3-Head]]` on `3a` with no `3`). The title part is not checked.
- A note with no predecessor (a bare root) MUST NOT have a previous link.
- A note has one predecessor, so more than one previous link is a mismatch.

## Origin

Written from the vault note `1e2b-Dot notation for multiple branches`. That note stays as the idea; this file is the specification.
