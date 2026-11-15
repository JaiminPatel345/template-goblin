# @template-goblin/core/src/types

Structural types partition directory for packages/core/src.

## Overview

All shared types across TemplateGoblin are centralized in `@template-goblin/types` to enforce the single-source-of-truth invariant. This directory serves as a structural partition within `packages/core/src` and does not define duplicate types.

## Invariants

- **Single Source of Truth (Rule 3)**: All shared and core data contracts (`TemplateManifest`, `FieldDefinition`, `InputJSON`, `ValidationError`) reside exclusively in `@template-goblin/types`.
- **No Duplicate Types**: `packages/core` strictly prohibits local duplicate type definitions.

## Side Effects

None.

## Verification

- Run: `pnpm --filter template-goblin test`
