---
"@ggsvelte/spec": patch
"@ggsvelte/core": patch
"@ggsvelte/svelte": patch
---

# Extract dataChecks layer walk; per-layer style/color evidence (#844)

Move geom/stat type rules, field existence, and channel collection into
`validate-data-checks-layer.ts` so `dataChecks` is a thin orchestrator
(evidence → walk → style/position/color checkers).

Style and color scale checks now take the same per-use `evidenceForUse`
path as position (#609): multi-table layers that share a field name keep
their own type view, so a later quantitative layer no longer last-wins-hides
an earlier sequential/finite-style mismatch.

Migration: none — validation is stricter only for multi-table same-name
field cases that previously under-reported scale-type-mismatch.
