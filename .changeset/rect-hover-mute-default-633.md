---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix: default geom_col/bar inspect is tooltip-only (no sibling mute flicker)

Bar/column hover no longer mutes sibling marks by default. Instant opacity
mask toggles at bar gaps caused full-plot flicker under normal pointer
movement. Default inspection is tooltip/ring-chrome only (rects still skip
point rings). Opt in with `inspect={{ muteSiblings: true }}`; muted marks
ease opacity with a short CSS transition (disabled under
`prefers-reduced-motion`).

Migration: none for typical charts. Authors who want #386-style relative
de-emphasis on hover should set `inspect={{ muteSiblings: true }}`.
