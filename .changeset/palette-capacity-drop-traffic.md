---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

fix(docs): capacity-matched palette specimens; drop tableau_traffic

/palettes always plotted the 8-squadron Armada tonnage bars. Short palettes
cycled colours and long palettes left most swatches unused. Specimens now pick
a real HistData series with exactly as many categories as the palette has
colours (polio 2–3, Armada men 4–10, Langren 11–12, chest sizes 13–16, cholera
districts 17–24).

Also remove the Tableau Traffic categorical scheme (`tableau_traffic` /
`TABLEAU_TRAFFIC_PALETTE`) — the red/yellow/green KPI triples were a weak
showcase ramp and are not kept in the docs or skill tables.

Migration: <https://ggsvelte.sh/guide/scales-guides>

If you set `scheme: "tableau_traffic"`, switch to another ordinal scheme
(e.g. `tableau10`, `Set1`, or an explicit `range`).
