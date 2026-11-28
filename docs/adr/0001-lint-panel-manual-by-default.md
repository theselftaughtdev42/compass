# One lint panel, manual by default

Lint issues reach the user through a single side panel in the right sidebar, plus a count notice, rather than file explorer markers, a modal or inline editor decorations. Linting runs only when the user asks for it. An opt-in **Auto re-run lint** setting re-lints while the panel is open. When it is off, the panel shows a stale banner once a main note changes.

## Considered options

- **File explorer markers**: rejected for now. They depend on Obsidian's internal explorer DOM, don't work well on mobile, and have no room for several lint issues per note or for the fixes #6 will add.
- **Modal**: rejected. It disappears when closed, so you can't work through the issues while editing notes.
- **Automatic linting on vault events by default**: rejected. It goes against the "keep startup light, avoid excessive vault scans" guidance, and a Zettelkasten in progress is often mid-edit and noisy. It is available as an opt-in.

## Consequences

- Every other lint feedback surface (markers, fixes, status bar) should hang off the panel's report, not create a parallel one.
- A panel restored with the workspace layout shows a "not run yet" state and must not lint during `onload`.
