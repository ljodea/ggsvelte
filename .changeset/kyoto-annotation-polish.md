---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

docs(quickstart): name the epochs above the bands, and fix the callouts

The chart sent readers to a colour key at the foot of the plot to learn what
three coloured bands meant, under the title "Climate epoch" — a phrase that
editorialises where the data was doing fine on its own. The names now sit
above the bands they name, and the legend is gone.

They go in the strip between the panel top and the bands, which was already
empty: the earliest bloom in 1,200 years is 25 March and the domain starts on
18 March. No observation is displaced and the axis makes no new claim.

The baseline rule was `#9aa0a6` at alpha 0.7 and effectively invisible, marking
something nothing named. It is darker and full strength, and the caption says
what it is. The reference chart puts that label in the right margin; mid-April
is dense in every century, so there is nowhere inside the panel to say it
without printing text over data.

Callouts now state the record as well as the claim — "1323 · May 4, latest on
record" rather than "1323 — latest on record" — with a middle dot, and every
label sits left of the point it names with an end anchor, so no leader runs
back through its own words. Verified by measuring rendered geometry at 640,
900 and 1200px, not by eye.

Migration: none — additive
