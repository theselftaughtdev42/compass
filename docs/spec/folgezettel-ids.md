# Folgezettel ID notation

Status: draft. Working name until the notation has a proper one.

This is the source of truth for the syntax and sequence rules of Folgezettel IDs. Terms follow `GLOSSARY.md`. Every example is also in [`examples.json`](examples.json), which the test suite runs, so the examples here cannot drift from the code. If you change a rule, update both files.

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

The first segment is the **root**: a number that names the chain. It MUST NOT have leading zeros. `0` is allowed and names chain 0.

A bare root (e.g. `3`) is a topic head note. It is optional.

### R2. Alternating segments

After the root, segments alternate letter → number → letter …, starting with a letter. No separator is needed because each segment changes type.

- A **letter segment** is one or more lowercase letters `a`–`z`. Letters MUST be lowercase: `3A`, `3Ab` and `3aB` are invalid, never read as `3a` or `3ab`. A run of letters is always one segment: `aa` is one segment, not two.
- A **number segment** is a positive integer with no leading zeros. `0` is not a valid number segment.

### R3. Dots

Any segment after the root MAY be preceded by one or more dots. Dots MUST NOT appear before the root or at the end of an ID.

### R4. Canonical form

Each ID has exactly one spelling. Two IDs are the same ID only if their text is identical.

Invalid examples: `""`, `a`, `03`, `3A`, `3a01`, `3a0`, `3a.`, `.3a`, `3a-1`, `3a 1`.

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

## Origin

Written from the vault note `1e2b-Dot notation for multiple branches`. That note stays as the idea; this file is the specification.
