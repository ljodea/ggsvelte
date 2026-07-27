---
"@ggsvelte/core": patch
---

# Preserve geom_sf polygon holes under coord_transform (#809 phase 9)

`projectPathBatch` now projects each even-odd ring independently, remaps
`ringStarts` after tessellation, and keeps `fillRule: "evenodd"`. Multi-ring
compounds with any invalid vertex still drop whole. Replaces the #941 stopgap
that stripped interior rings under active projectors.
