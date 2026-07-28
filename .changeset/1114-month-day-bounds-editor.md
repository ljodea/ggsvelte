---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(svelte): interval bounds editor shows month-day as MM-DD

`temporalKind: "monthDay"` resolves values into a fixed leap reference year.
The bounds editor was printing that year via `toISOString()`, so authors saw
`2000-04-01T00:00:00.000Z` instead of the `04-01` form they write and the axis
shows. Drafts now format and parse as month-day (`MM-DD`) when the axis kind is
`monthDay`.

Closes #1114.
