# 0022 — `ggsvelte-render` becomes its own package (`@ggsvelte/cli`)

Date: 2026-07-31. Status: accepted.

## Problem

The `ggsvelte-render` bin shipped on `@ggsvelte/svelte`. The CLI exists for
one audience above all: embedded analytics agents that author PortableSpec
JSON in a sandbox and need the pipeline's validation errors, warnings, and
advisories before a chart reaches the host webapp. For that audience the old
packaging failed twice:

1. **The install was wrong-shaped.** Getting a validator meant installing the
   whole Svelte component library (with a `svelte ^5` peer dep) into an
   environment that renders nothing. Install agents read that as waste and
   trimmed it — observed in the field: an agent installing ggsvelte for a
   webapp edited the packaged skill to delete every CLI mention and shipped a
   JSON-only workflow. The charts its downstream agents produced carried
   warnings nobody saw.
2. **The packaging said "optional".** No release of its own, no install
   docs, two passing mentions in the skill. Nothing said the CLI is the
   designed feedback loop.

## Decision

- New published package `@ggsvelte/cli` (packages/cli) owns the
  `ggsvelte-render` bin. It depends only on `@ggsvelte/core` — no Svelte
  peer dep — so a sandbox image can install it with one line.
- `runCLI` stays in `@ggsvelte/core` (tested there); the cli package
  re-exports `runCLI`/`CLIIO` and ships the thin bin wrapper.
- `ggsvelte-codemod` stays on `@ggsvelte/svelte`: it rewrites component
  usage and belongs with the components.
- Clean break, no alias bin left on `@ggsvelte/svelte` (pre-1.0 breaking
  rides a minor per ADR 0013). Two install paths would recreate the
  ambiguity this split removes.
- `@ggsvelte/cli` joins the changesets **fixed** group: all four packages
  share one version.
- Skill and docs now state the CLI is part of the install contract for
  agent-driven chart generation, with sandbox install instructions.

## Release mechanics

npm trusted publishing (OIDC) cannot first-publish a new package
(npm/cli#8544): the maintainer publishes `@ggsvelte/cli@0.22.0` once by hand
(`NPM_CONFIG_PROVENANCE=false npm publish --access public` — provenance
needs OIDC), configures the trusted publisher for the package, and only then
merges the next Version Packages PR so `changeset publish` covers all four
via OIDC. Skipping that order half-publishes the fixed group.
