---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: keep binned legend bin edges distinguishable (#955)

Default binned colour and numeric-style legends formatted edges with axis
`tickStep(domain, 5)` precision, so fractional bins on a small domain (e.g.
0–4 over 5 bins) could collapse adjacent edges to the same label and emit
degenerate ranges like `"2–2"`. Labels now derive decimals from the minimum
adjacent bin width so distinct edges stay distinct; integer-edge legends and
explicit `labels` formats are unchanged.

Migration: none — display-only for affected fractional-bin legends
