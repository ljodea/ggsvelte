---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(scale): ptol and canva categorical palettes (ggthemes ptol_pal / canva_pal)

Clean-room port of ggthemes `ptol_pal()` and `canva_pal()`.

- `ptol`: Paul Tol's qualitative palette (SRON/EPS/TN/09-002) at full
  capacity — the n = 12 selection. ggthemes re-selects the set per n; this
  port flattens to the fixed full-capacity order (prefix subsets
  approximate the smaller-n picks, documented on the constant), matching
  the economist palette's precedent.
- `canva`: the `scale_*_canva` default "Fresh and bright" (4 colors,
  extracted from `data/canva_palettes.rda`). ggthemes ships 150 named
  four-color Canva palettes; only the default is registered (documented
  subset, same call as excel_new's Office themes).
- Docs `/palettes` gains the two cards (21 total).

Migration: none — additive
