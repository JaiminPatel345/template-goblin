---
'template-goblin': minor
---

`InputJSON.images.<key>` now accepts a local file path, an HTTP/HTTPS URL,
a `data:` URI, or an explicit `{ type, value }` shape — in addition to the
existing `Buffer` and bare base64 string (#69). Library users with image
data on disk, behind an S3 presigned URL, or anywhere fetchable can pass
the path/URL directly instead of writing their own loader before
`generatePDF()`. Auto-detection runs in the pre-flight pass: `data:` →
decode, `http(s)://` → fetch with timeout, path-shaped string +
`fs.existsSync()` → read, otherwise → bare base64 (catch-all). The
explicit object form (`{ type: 'path' | 'url' | 'base64' | 'buffer',
value, headers? }`) is the escape hatch when auto-detection picks the
wrong branch (e.g. base64 starting with `/`). `generatePDF` gains an
optional third arg with `imageFetchTimeoutMs` (default 10 000) and
`imageResolveConcurrency` (default 6). All failures raise
`MISSING_ASSET` / `INVALID_FORMAT` with `fieldId`, `jsonKey`, and the
resolved path/URL/HTTP status in `error.details`.
