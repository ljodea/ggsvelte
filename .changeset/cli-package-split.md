---
"@ggsvelte/cli": minor
"@ggsvelte/svelte": minor
"@ggsvelte/core": minor
---

# CLI split: ggsvelte-render moves to @ggsvelte/cli

The `ggsvelte-render` CLI moves to its own package, `@ggsvelte/cli` (ADR 0022).

- `@ggsvelte/cli` (new): owns the `ggsvelte-render` bin; depends only on
  `@ggsvelte/core`, so agent sandboxes install the spec feedback loop without
  the Svelte component library. Also re-exports `runCLI`/`CLIIO` for
  spawn-free embedding.
- `@ggsvelte/svelte` (breaking, pre-1.0 minor): no longer ships the
  `ggsvelte-render` bin. Migrate with `npm install -g @ggsvelte/cli` (or add
  `@ggsvelte/cli` as a dependency) — the command name and behavior are
  unchanged. `ggsvelte-codemod` still ships with `@ggsvelte/svelte`.
- `@ggsvelte/core`: the `--version` help text no longer names
  `@ggsvelte/svelte`; `runCLI` reports the version its caller passes.

Migration: <https://ggsvelte.sh/guide/upgrading#cli-moved-to-ggsvelte-cli>
