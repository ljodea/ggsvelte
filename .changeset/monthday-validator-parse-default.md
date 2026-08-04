---
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: tier-2 validation accepts bare month-day values on monthDay scales

The runtime parses an unset `parse` on a `temporalKind: "monthDay"` scale
with the `md` parser (temporal-position.ts), but the validator fell back to
plain `auto` — so annotation fields holding exactly the values the scale is
for ("03-18", "05-08") failed `scale-type-mismatch` while rendering fine.
Any spec with month-day annotation rows on a monthDay axis (the sakura
lesson chart's epoch bands, record callouts, ring layers) now validates
clean; the error message names the effective parser.

Migration: none — validation-only false positive removed
