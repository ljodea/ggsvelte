---
"@ggsvelte/svelte": patch
---

# Align inspect tooltip Total and overflow with multi-layer groups

Migration: none — `groupTotal` / `groupMemberCount` on axis-mode inspection
snapshots still mean full-group unique series contributions; they now include
distinct series from every layer (not only the focus layer) while still
deduping multi-layer paints of the same source series (line+point, col+text).
