# @ggsvelte/cli

## 0.24.1

### Patch Changes

- 45c6cc9: # Refresh package README front doors

  Migration: none — package README + skill docs only

  Rewrite the npm package READMEs for current APIs; treat them as shipped
  surfaces for changesets and CI; execute TypeScript fences in unit tests. Fix
  skill prose that still called 0.13.0 grammar-prop removal “planned.”

- 06afe2c: # Share frozen band domain across facet guide plans

  Migration: none — internal memory hygiene; guide plan domain contents and freeze contract unchanged.

  Under fixed facet scales, band axis guide plans reused to copy `scale.rawDomain`
  once per panel. Reuse the already-frozen array when present so panels share one
  object. Free scales still get distinct domains because each panel trains its own
  `rawDomain`.

- Updated dependencies [45c6cc9]
- Updated dependencies [06afe2c]
- Updated dependencies [95aa7b2]
  - @ggsvelte/core@0.24.1

## 0.24.0

### Patch Changes

- Updated dependencies [a3de79e]
- Updated dependencies [12da8b8]
- Updated dependencies [8c9685f]
- Updated dependencies [8f75979]
- Updated dependencies [375f0d2]
- Updated dependencies [e28fa5f]
- Updated dependencies [4d23a25]
  - @ggsvelte/core@0.24.0

## 0.23.0

### Minor Changes

- 50e9292: # CLI split: ggsvelte-render moves to @ggsvelte/cli

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

### Patch Changes

- Updated dependencies [50e9292]
- Updated dependencies [1d68bcc]
- Updated dependencies [322bc60]
- Updated dependencies [97f739a]
- Updated dependencies [8987d9c]
- Updated dependencies [ccdab47]
- Updated dependencies [c8d7484]
- Updated dependencies [e57bdbf]
- Updated dependencies [9e43af7]
- Updated dependencies [488f170]
- Updated dependencies [a54207b]
- Updated dependencies [9ae7909]
- Updated dependencies [4870c0c]
- Updated dependencies [146c2c8]
  - @ggsvelte/core@0.23.0

## 0.22.0

Initial extraction: the `ggsvelte-render` bin moved here from
`@ggsvelte/svelte` so agent sandboxes can install the spec feedback loop
without the Svelte component library. Release history before 0.22.0 lives in
the `@ggsvelte/svelte` changelog.
