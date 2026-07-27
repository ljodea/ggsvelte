---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# One diagnostic prose source (#987)

- Move `PIPELINE_ERROR_CATALOG` into `@ggsvelte/spec` (re-exported from core)
- Dual-channel codes share `DUAL_ERROR_PROSE` so summary/fix cannot drift
- Rename validation code `scale-manual-domain-range` → `color-manual-domain-range`
- Docs error-reference imports pipeline error prose from `@ggsvelte/spec`

Migration: <https://ggsvelte.sh/guide/upgrading#0-11-to-0-12>
