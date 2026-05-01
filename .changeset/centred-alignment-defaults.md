---
'template-goblin-ui': patch
---

Default new fields, columns, and preview fallbacks to centre alignment (#39). New text and table fields are now created with `align: 'center'` + `verticalAlign: 'middle'`. Adding a new column to a table stamps the same centred alignment explicitly so the sidebar and the rendered cell agree from the first paint. Existing templates loaded from disk are untouched — only newly-created fields/columns pick up the new default.
