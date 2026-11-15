# @template-goblin/site/src/sections

Composable landing page sections delivering the marketing message, comparison benchmarks, architecture highlights, and call-to-actions.

## Overview

Contains the full set of modular landing page section components that compose the root marketing page (`/`).

## Interface

- `Hero`: Above-the-fold introductory banner with interactive install command copy
- `WhatIs`: Two-surface product model explanation showing visual editor vs. programmatic PDF generation
- `ExamplesShowcase`: Feature card highlighting real-world production templates such as the Zomato invoice
- `Motivation`: Problem statement detailing designer-developer handoff friction and PDF generation pain points
- `Compare`: Feature comparison table contrasting Canva, pdf-lib, and TemplateGoblin
- `WhyGoblin`: Grid of key architectural capabilities including pure TypeScript runtime, scale, and portability
- `HowItWorks`: Three-step visual workflow (Design -> Export -> Generate)
- `CtaBand`: High-conversion closing banner with editor playground launch action

## Invariants

- **Stateless Presentations**: Sections are purely functional UI presentations, except `Hero` which maintains transient clipboard copy feedback state.
- **Inline SVGs**: All icons are rendered as inline SVGs without external icon dependencies.
- **Link Security**: External links declare appropriate security attributes (`rel="noreferrer"`).

## Side Effects

- `Hero`: Writes package install command (`npm i template-goblin`) to `navigator.clipboard`.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
