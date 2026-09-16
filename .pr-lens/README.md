# .pr-lens

PR Lens writes its previews here: the diagrams as light and dark SVGs, the
document they were drawn from, and the manifest describing them.

None of that belongs in a commit. Those files are rebuilt from the diff by
`pr-lens analyze` and `pr-lens render`, so a stale copy in the history is
worth less than nothing — it is a diagram of a pull request somebody already
merged. What readers are meant to see is the comment on the pull request, or
the share page it links to. Delete them whenever you like; nothing reads them
back.

`canvas.json` is the exception. It holds the write token for every canvas
this checkout has pushed with `pr-lens canvas push`, and nothing can rebuild
it. Without it the canvases stay readable by everyone, but pushing to them
again needs the edit link you were given. Keep it out of commits and out of
other people's hands.
