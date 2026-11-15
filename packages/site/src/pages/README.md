# @template-goblin/site/src/pages

Top-level application route views for landing, template examples showcase, 404 fallback, and documentation sub-routes.

## Overview

Contains the top-level route components mounted by the application router in `App.tsx`.

## Subdirectories & Boundaries

- [docs](./docs/README.md): Documentation pages covering editor usage, SDK integration, schema models, file format, and batch generation.

## Interface

- `Home`: Main marketing landing page combining hero, value proposition, live examples, comparison matrix, and CTAs
- `Examples`: Production template showcase with sample downloads (`.tgbl` / `.pdf`) and playground deep links
- `NotFound`: 404 error page and static GitHub Pages SPA fallback view

## Invariants

- **Page Metadata**: Each page updates document meta tags via `useDocumentMeta`.
- **Error Recovery**: `NotFound` provides clear user routing recovery links back to home and the visual playground.
- **Asset Paths**: `Examples` binds sample assets to `import.meta.env.BASE_URL` for correct static asset resolution.

## Side Effects

- Mutates browser document title and head metadata on route mount.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
