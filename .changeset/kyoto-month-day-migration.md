---
"@ggsvelte/svelte": patch
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix(data): drop `bloomRefDate` from the Kyoto teaching dataset

The column projected each observation's day-of-year onto the year 2001 so a
date axis could draw it. Two things were wrong with that. It shipped a
fabricated year inside published data — no other copy of Aono's record has
anything like it — and it preserved day-of-year rather than month-day, so
**204 of 838 rows disagreed with `bloomDate` by a day**. Year 812 bloomed on
1 April and the column said 2 April.

`temporalKind: "monthDay"` removes the need for it. The year now collapses
inside the scale, where it is a private implementation detail.

This is a bundled teaching/demo dataset, not a product API contract. Anyone
still mapping `y: "bloomRefDate"` should map `y: "bloomDate"` and give the
axis a month-day scale:

```svelte
<GGPlot data={kyotoSakura} aes={{ x: "year", y: "bloomDate" }}>
  <ScaleYMonthDay reverse domain={["05-10", "03-18"]} />
</GGPlot>
```

`bloomDate` (the real observation) and `bloomDoy` are unchanged. Anyone who
needs the old projection can compute it, but the month-day scale is the
correct answer and does not have the leap-year fault.

The getting-started lesson migrates with it, so the spec it teaches now
contains no year outside the `year` column itself.

Guide: <https://ggsvelte.sh/guide/scales-guides#date-and-time-axes>
