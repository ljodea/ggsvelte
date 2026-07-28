---
"@ggsvelte/core": minor
---

<!-- markdownlint-disable MD041 -->

feat(core): project month-day values so the year actually collapses

`temporalKind: "monthDay"` validated and authored but did not yet change what a
chart drew. Now it does: values reach the scale with their year replaced by the
reference year, so two observations of the same calendar day from different
years occupy one position.

The projection sits in `positionColumn` and `positionValuesToNumeric`, the two
doors into scale space, so marks, trained domains, annotation intercepts and
stat frames all agree. It is idempotent — a binned median of already-projected
instants is another already-projected instant, and re-projecting it is a no-op.

A month-day axis defaults to the `md` parser rather than `auto`, which would
read `"04-05"` as a category and never take the temporal path at all.

Two preflight gates learned the same exemption a `time` axis already has: a
field parsing as `date` is exactly what a month-day axis expects to be handed,
not a contradiction. Without both, `y: "bloomDate"` threw
`temporal-parse-failed`.

Migration: none — additive
