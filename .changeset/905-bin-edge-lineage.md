---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: bin-edge lineage replays the stat's own cut (#905)

`stat_bin` and `stat_summary_bin` cut rows on ggplot2's **fuzzed** break grid
but emitted only the exact edges, so interaction lineage — which re-derived
membership from those edges — disagreed with the stat for any value inside the
fuzz band around an interior break. A hovered bin could report a row that never
contributed to it while omitting one that did.

The binning stats now carry the cut they performed (fuzzed grid, closed side,
and per-row bin index), and both lineage consumers replay it, so represented
rows always match the rows the stat consumed.

Migration: none — interaction lineage only
