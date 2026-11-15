# @template-goblin/ui/bin

Standalone static HTTP server executable that hosts the pre-built visual builder UI.

## Overview

Provides the executable entrypoint for the `template-goblin-ui` CLI (`npx template-goblin-ui`). Launches a lightweight Node.js HTTP server that serves the bundled production UI assets from `dist/` and opens the browser.

## Interface

- CLI command: `template-goblin-ui` (`bin/cli.js`)
- Options: `--port <number>` (default: 4242 or `process.env.PORT`)

## Invariants

- **Distribution Precondition**: `distDir` (`../dist`) must exist prior to server execution (requires build output).
- **Path Traversal Protection**: Requested URLs must resolve strictly inside `distDir`, responding with 403 otherwise.
- **Graceful Shutdown**: Registers `SIGINT` and `SIGTERM` listeners for graceful process termination.

## Side Effects

- Listens on network port (default 4242).
- Serves static files from `dist` directory with appropriate MIME types.
- Logs shutdown notice and exits process on termination signals or missing `dist`.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
