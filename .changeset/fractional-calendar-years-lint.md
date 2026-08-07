---
"@ggsvelte/spec": minor
"@ggsvelte/skill": minor
---

Detect year+month/12 linear coordinates as a lint advisory

`lintSpec` and `ggsvelte-render` (stderr, source `spec-lint`) emit
`fractional-calendar-years` when a position channel holds year-like numbers
with month fractions on a linear scale — the pitfall that labels axes and
Inspect pins as decimals like 1855.9. Prefer ISO month/date strings and a
time scale. Theme specimens for the Crimean stacked area now use that encoding.
