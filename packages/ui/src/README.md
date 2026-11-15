# @template-goblin/ui/src

React application root orchestrating top-level stores, error boundaries, dialog providers, toolbar, panels, and canvas workspace.

## Overview

Application bootstrap, root routing layout, and top-level provider orchestration for the TemplateGoblin visual builder.

## Subdirectories & Boundaries

- [components](./components/README.md): Presentation components including canvas, panels, dialogs, toolbar, and icons.
- [hooks](./hooks/README.md): React hooks for keyboard navigation and sample template loading.
- [store](./store/README.md): State management stores (Zustand) and IndexedDB persistence.
- [theme](./theme/README.md): Visual design tokens, field colors, and theme constants.
- [utils](./utils/README.md): Archive assembly, JSON projection, and preview helpers.

## Interface

- `App`: Root component assembling `Toolbar`, `LeftPanel`, `CanvasArea`, `RightPanel`, and modals
- `main.tsx`: Entrypoint mounting React root and initializing polyfills

## Invariants

- **Global Buffer Polyfill**: Polyfills `Buffer` on `globalThis` if absent before executing core PDF dependencies.
- **Root Protection**: Renders application tree enclosed by `ErrorBoundary` and `DialogProvider`.
- **Single Canvas Origin**: Enforces synchronous state updates to avoid canvas object desynchronization.

## Side Effects

- Mounts React tree to DOM root element `#root`.
- Binds global window resize, focus, and keyboard listeners.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
