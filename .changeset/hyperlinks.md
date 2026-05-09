---
'template-goblin': major
'template-goblin-ui': major
'@template-goblin/types': major
---

Add hyperlink support — clickable elements in generated PDFs (#87).

Designers can attach a URL to any text, image, or table field via a new "Link" section in the Properties panel. Two flavours:

- **Static**: a literal URL pinned in the manifest (`{ mode: 'static', url }`).
- **Dynamic**: a `texts[jsonKey]` lookup (`{ mode: 'dynamic', jsonKey }`) resolved per render so the URL can vary across runs.

Allowed protocols: `https`, `http`, `mailto`, `tel`. Anything else is rejected as `INVALID_DATA_TYPE` with field context. Empty / missing dynamic values render the field without a clickable region (no error). For tables, the link covers the whole table's bounding rect — there is no per-row or per-column variant in v1.

### Schema additions

- `FieldBase.hyperlink?: Hyperlink` — optional on every field.
- New `Hyperlink` discriminated union exported from `@template-goblin/types`.
- New helpers: `isValidHyperlinkUrl`, `isStaticHyperlink`, `isDynamicHyperlink`.

### Why major

This is an additive but cross-cutting schema change touching public types, manifest validation, runtime data validation, and PDF rendering. The schema additions are backward-compatible (the field is optional), but the SDK contract grows in a way library consumers will want to opt into deliberately, so we cut a major.

### Out of scope (deferred)

- Per-cell or per-column links inside tables.
- Anchor links inside the same PDF (`#named-dest`).
- Click-tracking / analytics wrappers — designer's own concern.
- A canvas adornment showing which fields are linked — UI-only follow-up.
