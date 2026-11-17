# @template-goblin/site/src/pages/docs

Documentation content pages covering editor usage, SDK integration, schema models, file format, and batch generation.

## Overview

Contains the individual documentation page components rendered inside `DocsLayout`. Topics cover both visual builder workflow for designers and Node.js SDK integration for backend developers.

## Interface

- `DocsHome`: Documentation landing page directing users to designer or developer tracks
- `UseTheUi`: Step-by-step visual editor walkthrough for designers
- `ElementTypes`: Comprehensive reference for Text, Image, and Table element properties, options, and code samples
- `Sdk`: SDK installation, PDF generation examples, server setup, and error handling reference
- `Schema`: Reference documentation for input JSON, dynamic bindings, and template manifest schemas
- `FileFormat`: Technical reference for `.tgbl` ZIP archive structure, manifest, and binary asset packaging
- `Batch`: Scaling guide for parallel PDF rendering pools and cloud storage uploads

## Invariants

- **Uniform Header**: All doc pages invoke `DocHeader` to enforce consistent title, metadata, and breadcrumb structure.
- **Spec Compliance**: Code snippets represent verified TypeScript and JSON interfaces aligned with `@template-goblin/core` and `@template-goblin/types` contracts.
- **Route Consistency**: Relative internal links conform to React Router definitions under `/docs/*`.

## Side Effects

- Updates `document.title` and meta description tags via `DocHeader` on page navigation.

## Verification

- Run: `pnpm --filter @template-goblin/site build`
