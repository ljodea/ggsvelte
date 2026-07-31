---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

# Lean render path

Migration: none — additive

Add lean chart import paths that drop TypeBox validation and the Temporal polyfill from identity-chart client bundles.

- `@ggsvelte/core/render` — pipeline + SVG with basic geoms only (no heavy stats).
- `@ggsvelte/core/temporal` — optional install for time scales / Temporal polyfill.
- `@ggsvelte/spec/portable` — fluent builder that finishes with normalize only.
- `GGBuilder.toPortable()` on the full package; `.spec()` still TypeBox-validates.

Measured lean scatter path: ~327 KB → ~140 KB gzip (−57%). Full package default entry stays complete.
