---
"@ggsvelte/svelte": minor
---

# Default tooltip content policy for high-n stacks

Migration: none for hosts that use pin / custom content. Axis-group
(`mode: "x"` / `"y"`) inspections now expose `groupTotal` (sum of numeric
contributions across the full group). Default hover presentation already
capped at 8 members; the selection is top-k by absolute value with the
focused series force-included, plus a Total row and overflow line. Pin still
lists the full group in the scrollable panel; `<Inspect content>` and
`oninspect` remain the opt-in for custom full listings. A new advisory,
`INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE`, fires when inspect is on and
an ordinal color/fill domain has at least 16 levels.
