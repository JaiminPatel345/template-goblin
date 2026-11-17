# @template-goblin/site

Vite and React static marketing site and documentation hub deployed to GitHub Pages.

## Overview

Marketing website and documentation center for TemplateGoblin. Features an interactive landing page, code examples, production template showcase, and full SDK documentation.

## Subdirectories & Boundaries

- [src](./src/README.md): Client-side SPA application root, routing tree, pages, sections, and utilities.

## Interface

- `pnpm dev`: Starts the Vite development server with `/playground` reverse proxy
- `pnpm build`: Compiles TypeScript and builds production static bundles to `dist/`
- `pnpm type-check`: Verifies TypeScript types without emitting code
- `pnpm lint`: Runs ESLint across site codebase
- `pnpm preview`: Serves built static distribution locally

## Invariants

- **Static Routing on GitHub Pages**: `staticRoutesPlugin` emits `index.html` clones for all known routes to guarantee clean deep-linking without 404 workarounds.
- **Bypass Jekyll**: Emits `.nojekyll` in build output directory to bypass Jekyll static file filtering.
- **Playground Proxy**: Dev server proxies `/playground` traffic to `packages/ui` running on port 5174.

## Side Effects

- Production build writes static bundles and asset outputs to `packages/site/dist/`.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
