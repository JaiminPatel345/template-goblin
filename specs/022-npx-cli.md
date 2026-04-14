# Spec 022 — npx CLI

## Status

Draft

## Summary

Provides a zero-install way to launch the TemplateGoblin UI locally via `npx template-goblin-ui`. A `bin/cli.js` script spins up a lightweight HTTP server using Node's built-in `http` module to serve pre-built static files, opening the UI at `http://localhost:4242`. This follows the same pattern as `npx prisma studio` -- no global install required, no external server dependencies.

## Requirements

- [ ] REQ-001: Running `npx template-goblin-ui` starts a local HTTP server and serves the TemplateGoblin UI.
- [ ] REQ-002: The entry point is `bin/cli.js`, referenced by the `bin` field in `package.json`.
- [ ] REQ-003: The server uses Node's built-in `http` module -- no Express, Koa, or other framework dependencies.
- [ ] REQ-004: Pre-built static UI files (HTML, CSS, JS, assets) are bundled in the published npm package.
- [ ] REQ-005: The default port is `4242`. If port 4242 is in use, print an error message and exit with a non-zero code.
- [ ] REQ-006: The CLI prints the local URL (`http://localhost:4242`) to stdout on successful startup.
- [ ] REQ-007: The CLI handles `SIGINT` (Ctrl+C) gracefully, closing the server and exiting cleanly.
- [ ] REQ-008: Serve correct MIME types for all static assets (`.html`, `.css`, `.js`, `.png`, `.svg`, `.ttf`, `.json`).
- [ ] REQ-009: Requests to unknown paths return the `index.html` (SPA fallback) for client-side routing.
- [ ] REQ-010: The `package.json` `bin` field maps the command name `template-goblin-ui` to `bin/cli.js`.

## Behaviour

### Happy Path

1. Developer runs `npx template-goblin-ui` in their terminal.
2. npm downloads and caches the `template-goblin-ui` package if not already present.
3. `bin/cli.js` executes: it resolves the path to the bundled static files directory.
4. A Node `http.createServer` instance starts listening on port 4242.
5. The CLI prints: `TemplateGoblin UI running at http://localhost:4242`
6. Developer opens the URL in a browser and uses the UI.
7. Developer presses Ctrl+C; the server shuts down and the process exits with code 0.

### Edge Cases

- Port 4242 is already in use: the CLI prints `Error: Port 4242 is already in use. Close the other process or try again later.` and exits with code 1.
- The `--port` flag is provided (e.g., `npx template-goblin-ui --port 3000`): use the specified port instead of 4242.
- The static files directory is missing (corrupted install): print `Error: UI build files not found. Try reinstalling the package.` and exit with code 1.
- Request for a file outside the static directory (path traversal attempt): return 403 Forbidden.
- Running on a system without a browser: the server still starts; the developer manually opens the URL.

### Error Conditions

- Port conflict: exit code 1 with descriptive message.
- Missing build files: exit code 1 with descriptive message.
- Unhandled server error: log the error to stderr and exit with code 1.

## Input / Output

```typescript
// bin/cli.js (Node script, not a module export)

// package.json bin field:
// "bin": { "template-goblin-ui": "bin/cli.js" }

// CLI arguments:
//   --port <number>   Override the default port (4242)
//   --help            Print usage information
//   --version         Print the package version

// stdout on success:
// "TemplateGoblin UI running at http://localhost:<port>"

// stderr on failure:
// "Error: <descriptive message>"

// Exit codes:
//   0 — clean shutdown
//   1 — startup failure
```

### File Structure

```
template-goblin-ui/
  bin/
    cli.js              ← entry point (#!/usr/bin/env node)
  dist/
    index.html          ← built UI entry
    assets/             ← JS, CSS, images
  package.json          ← bin field, files field includes dist/ and bin/
```

## Acceptance Criteria

- [ ] AC-001: `npx template-goblin-ui` starts a server and prints the local URL to stdout.
- [ ] AC-002: Opening `http://localhost:4242` in a browser loads the TemplateGoblin UI.
- [ ] AC-003: Static assets (JS, CSS, images) are served with correct MIME types.
- [ ] AC-004: Unknown routes return `index.html` for SPA client-side routing.
- [ ] AC-005: Pressing Ctrl+C shuts down the server gracefully with exit code 0.
- [ ] AC-006: If port 4242 is in use, the CLI exits with code 1 and a descriptive error message.
- [ ] AC-007: `--port 3000` starts the server on port 3000 instead of 4242.
- [ ] AC-008: `--help` prints usage information and exits.
- [ ] AC-009: `--version` prints the package version and exits.
- [ ] AC-010: Path traversal attempts (e.g., `/../../../etc/passwd`) return 403 Forbidden.
- [ ] AC-011: The `bin` field in `package.json` maps `template-goblin-ui` to `bin/cli.js`.

## Dependencies

- Spec 009 — UI Builder (the pre-built static files served by the CLI).

## Notes

- The CLI is intentionally minimal -- it is a static file server, not an API server. All template operations happen client-side in the browser.
- Open question: should the CLI attempt to auto-open the browser (e.g., via `open` or `xdg-open`)? This is convenient but can be annoying in CI environments. A `--no-open` flag could control this.
- Open question: should the CLI support `--host 0.0.0.0` for network access, or always bind to `localhost` for security?
