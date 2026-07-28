---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat(spec): month-day scale surface — the `md` parser and `temporalKind: "monthDay"`

Plotting observations from many years against the calendar day they fell on
had no representation. Authors faked it by projecting every value onto an
invented reference year and carrying that year in their data — which is how
the Kyoto cherry-blossom lesson ended up shipping a `bloomRefDate` column
whose only job was to be thrown away by the axis.

`temporalKind: "monthDay"` says it directly: the year collapses inside the
scale, so the same calendar day from any year shares one position.

```svelte
<ScaleYMonthDay
  reverse
  domain={["05-10", "03-18"]}
  breaks={["04-05", "04-15"]}
/>
```

Values, `domain`, and `breaks` all drop the year. They resolve through a new
`md` parser, which takes `MM-DD`, the ISO recurring form `--MM-DD`, or a full
date whose year it discards. It joins the partial-date family beside `ym`,
`my`, and `yq`, and — like them — is never chosen by automatic inference.

**Month and day survive; day-of-year does not.** Those differ for every leap
year, which is exactly the bug the reference-year trick used to introduce.

This ships the authoring surface: helpers, builder methods, generated
components, schema, and validation. Rendering follows.

Colour scales keep `date | datetime`. Month-day is a position idea and
nothing asked for it there.

Internally `TemporalScaleKind` is a new type, deliberately not a widening of
`TemporalKind`. `TemporalKind` is also what parsing a value _returns_, and no
value parses to `monthDay` — it is a projection applied afterwards. Splitting
them keeps `decision.kind === conversion.requestedKind` comparisons honest at
compile time.

Migration: none — additive
