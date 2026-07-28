---
"@ggsvelte/core": minor
"@ggsvelte/spec": minor
---

<!-- markdownlint-disable MD041 -->

feat(core): month-day axes read "Apr 1", and refuse labels they cannot fill

A month-day axis carried its values correctly but formatted them through the
datetime path, so ticks read `2000-04-01 00:00:00 UTC` — the reference year
exposed in the one place a reader was guaranteed to look. Axis ticks, the
crosshair, and the tooltip header now read `Apr 1`.

`fullLabel` is fixed too. It is not the visible tick, which is exactly why the
leak was quiet, and it reaches the guide plan.

The automatic interval ladder drops week and year for this kind. A year tick on
a one-year axis is the same tick twice, and a week tick implies a weekday that
belongs to the reference year rather than to the data. Day, month, and quarter
remain; an authored `dateBreaks` is still honoured as given.

`dateLabels` now rejects tokens a month-day axis cannot fill honestly. The rule
is that a token is legal if and only if the month and the day determine it, so
`%m %b %B %d %e %q` are accepted and year, clock, zone, and weekday tokens are
refused with a message naming the offending token. `%a` is refused for the same
reason as `%Y`: 1 April fell on a different weekday in 812 than in 2001, so
printing one would invent a fact.

Migration: none — additive
