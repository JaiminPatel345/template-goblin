# @template-goblin/ui/src/components/Dialogs

Accessible custom modal dialog provider implementing promise-based alert, confirm, and prompt dialogs built on Radix Dialog.

## Overview

Provides declarative and imperative dialog triggers across the application UI, replacing browser-native `alert()`, `confirm()`, and `prompt()` with themed, accessible Radix-based modal components.

## Interface

- `DialogProvider`: Context provider wrapping application root
- `useDialogs`: Hook returning `DialogApi` (`alert`, `confirm`, `prompt`)
- Types: `DialogApi`, `AlertOptions`, `ConfirmOptions`, `PromptOptions`

## Invariants

- **Context Bound**: `useDialogs` must be called within `DialogProvider` hierarchy.
- **Single Active Dialog**: Only one dialog modal is open at any time.
- **Accessibility**: Traps keyboard focus within active modal, locks body scroll, and dismisses on `Escape`.

## Side Effects

- Renders modal backdrops and focus-trapped dialogs via React Portals.
- Resolves pending Promises upon user confirmation or dismissal.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
