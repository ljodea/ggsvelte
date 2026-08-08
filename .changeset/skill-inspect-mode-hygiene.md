---
"@ggsvelte/skill": patch
---

# Teach inspect mode selection and multi-layer hit hygiene

Migration: none — skill reference prose only; no API change.

Expand `references/interactions.md` and the SKILL.md Interactions pointer so
agents prefer `mode="auto"` when product auto matches geometry, pin
`mode="exact"` on violin / boxplot / discrete error bars (auto still freescrolls
those until #1528), mark decorative furniture `inspect={false}` (Minard-class
multi-layer hits), and verify hover/pin outside the CLI SVG loop. Records
keep-single skill packaging for #1530.
