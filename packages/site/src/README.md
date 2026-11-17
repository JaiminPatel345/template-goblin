# @template-goblin/site/src

Client-side SPA source root, routing hierarchy, root layout orchestration, and application bootstrap.

## Overview

Source entry point and orchestration layer for the TemplateGoblin static marketing and documentation site.

## Subdirectories & Boundaries

- [components](./components/README.md): Reusable UI components, icons, doc primitives, code display, and shared layout shells.
- [lib](./lib/README.md): Pure utility functions, syntax tokenization engine, shared link constants, and React browser hooks.
- [pages](./pages/README.md): Route pages including landing, examples showcase, and documentation views.
- [sections](./sections/README.md): Modular marketing landing page sections.

## Interface

- `App`: Root router component defining the application route table and scroll restoration
- `main.tsx`: Application entry point mounting `BrowserRouter` and `App` to the DOM

## Invariants

- **Scroll Restoration**: Enforces client-side scroll restoration to `(0, 0)` on every route navigation via `ScrollToTop`.
- **Basename Resolution**: Derives React Router basename from `import.meta.env.BASE_URL` with trailing slashes stripped.
- **Fail Fast Bootstrap**: Fails fast if root DOM container (`#root`) is missing during bootstrap.

## Side Effects

- `main.tsx`: Mounts React application to DOM container `#root`.
- `App.tsx`: Executes `window.scrollTo(0, 0)` on route change.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
