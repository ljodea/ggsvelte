---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

perf(spec): one field-evidence pass for validate + dataChecks

`validate(spec, options)` now builds plot and layer field evidence once via
`resolveLayerFieldEvidence` and shares it with data-aware checks and lint,
instead of pivoting/type-scanning plot tables twice.

When aggregate plot+layer tables exceed maxRows/maxBytes, data-backed lint
advisories are skipped (no plot-only evidence handoff on that error path).

Migration: none for valid under-limit specs
