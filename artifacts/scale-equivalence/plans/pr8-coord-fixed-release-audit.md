# PR 8 — fixed coordinates and scale-defaults release audit

## Scope

Complete the eight-PR scale-defaults program with a strict, JSON-portable fixed-aspect coordinate contract and the final integrated evidence/release audit.

## Public contract

- PortableSpec accepts `{ "coord": { "type": "fixed", "ratio"?: number } }` with a finite ratio greater than zero.
- `coordFixed()` is the TypeScript-first helper; `coord_fixed()` and `coord_equal()` are aliases over the same implementation.
- `GGBuilder.coordFixed()` and `GGBuilder.coordEqual()` author the same canonical output.
- Ratio means physical y-unit length divided by physical x-unit length. The fitted data rectangle therefore satisfies `height / width = ratio * yScaleSpan / xScaleSpan` using trained scale-space domains.
- Fixed aspect runs after title, caption, axes, and responsive guides reserve their space. It fits the largest centered data rectangle inside that allocation.
- Panel fill, grid, clipping, axes, strips, marks, and interactions use only the fitted data rectangle. Letterbox gutters use the theme-owned `letterboxFill` role (paper by default).
- Fixed-scale facets keep equal data-rectangle dimensions. Any free positional facet scale with fixed coordinates is rejected structurally and defensively at runtime.
- The ratio is never distorted. A fitted dimension below the 64 px readable threshold retains the largest valid rectangle, removes minor furniture, marks the Scene/SVG layout degraded, and emits one deduplicated `coord-fixed-degraded` warning.

## TDD order

1. Red Spec tests: schema, normalization, helpers/aliases, builder parity, invalid ratio, fixed+free structural rejection, type parity.
2. Red Core tests: data-rectangle ratio, transformed-domain ratio, centering/gutters, facets, runtime defensive rejection, degraded state, SVG semantics.
3. Red Svelte tests: public exports/prop composition, renderer parity, responsive resize, SSR/degraded marker.
4. Implement the smallest schema/helper/normalization, layout, Scene, theme, and renderer changes needed to pass.
5. Add docs, migration, ADR, deterministic eval, benchmark, R/browser evidence, generated artifacts, and release audit.

## Focused commands

```sh
bun test packages/spec/tests/coord-fixed-api.test.ts packages/core/tests/pipeline-coord-fixed.test.ts
cd packages/svelte && bun run test:browser -- --project chromium tests/scene/coord-fixed.test.ts
```

## Full gates

Run format/check/generated/eval/benchmark/packed-consumer/root tests, all Svelte browser engines, SSR, browser evidence through gstack browse, and authoritative CI/VR. Visual baselines may only be published through `vr-approve`.
