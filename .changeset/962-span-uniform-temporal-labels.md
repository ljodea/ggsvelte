---
"@ggsvelte/core": patch
---

<!-- markdownlint-disable MD041 -->

fix: use one consistent format for default temporal tick labels (#962)

Default (no `dateLabels`) tick sequences no longer mix full dates with bare
day numbers, or months with/without years, on the same axis. Visible labels
are chosen from the whole sequence span (`Mon d`, or `Mon d, yyyy` when the
span crosses years; months/quarters/hours follow the same span-uniform rule).
Explicit `dateLabels` and standalone `fullLabel` values are unchanged.

Migration: none — display-only for default temporal tick abbreviations.
