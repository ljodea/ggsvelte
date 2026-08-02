# @ggsvelte/cli

## 0.26.2

### Patch Changes

- Updated dependencies [b6d495a]
- Updated dependencies [add63a4]
- Updated dependencies [3b5b07f]
  - @ggsvelte/core@0.26.2

## 0.26.1

### Patch Changes

- Updated dependencies [3828c57]
- Updated dependencies [4e775d9]
- Updated dependencies [9b51ddf]
  - @ggsvelte/core@0.26.1

## 0.26.0

### Patch Changes

- Updated dependencies [56b856b]
  - @ggsvelte/core@0.26.0

## 0.25.0

### Patch Changes

- Updated dependencies [36efe51]
- Updated dependencies [7d92209]
- Updated dependencies [8074811]
- Updated dependencies [072640f]
- Updated dependencies [120b5de]
- Updated dependencies [1fbbf45]
- Updated dependencies [d15954d]
- Updated dependencies [7c748ec]
- Updated dependencies [86c36ab]
  - @ggsvelte/core@0.25.0

## 0.24.3

### Patch Changes

- Updated dependencies [a84fd4e]
- Updated dependencies [47a660a]
- Updated dependencies [5d8c5b8]
- Updated dependencies [a8c2292]
  - @ggsvelte/core@0.24.3

## 0.24.2

### Patch Changes

- Updated dependencies [36569c5]
  - @ggsvelte/core@0.24.2

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
