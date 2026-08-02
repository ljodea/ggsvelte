---
"@ggsvelte/svelte": minor
---

# Default tooltip content policy for high-n stacks

Migration: none — additive public surface only (`groupTotal` /
`groupMemberCount` on axis-group inspections; new
`INTERACTION_INSPECT_HIGH_CARDINALITY_DISCRETE` diagnostic). Existing hosts
keep working; pin / custom content / `oninspect` still cover full listings.

Axis-group default hover selects top-k by absolute value (focused series
always included), shows a stack Total row, and an overflow line when members
are truncated. Pin still lists the full group in the scrollable panel.
