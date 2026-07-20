---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Temporal scale semantics

Add strict, value-driven date and datetime scales across PortableSpec, fluent builder, and Svelte authoring. Raw four-digit year strings now infer a proportional UTC calendar axis after whole-column validation; ambiguous date orders and identifier-like values remain discrete until explicitly configured.

Add deterministic named, exact-format, epoch, timezone, and DST-disambiguation parsers; parser-keyed immutable table views; structured scale decisions and diagnostics; ggplot2-style scale aliases; and lubridate-style authoring helpers. Preserve original source values for interactions while using semantic epoch values before stats, positions, scale training, and rendering.

Migration: <https://ljodea.github.io/ggsvelte/guide/temporal-scales>

If a four-digit string field is an identifier rather than a calendar year, set the position scale to `type: "band"`, call `scaleXDiscrete()` / `scaleYDiscrete()`, or use the equivalent snake_case alias. Ambiguous DMY/MDY input now requires an explicit parser such as `parse: "dmy"` or `parse: "mdy"`.
