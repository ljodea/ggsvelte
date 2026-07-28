---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

fix(inspect): drop duplicate columns from default tooltips

When fill or color remaps the same column as a position channel (common on
categorical bars: `aes(x = cat, fill = cat)`), the default tooltip listed that
column twice — once under the labs title and again under the raw field name.
Default tooltips now keep the first row per column name, matching a11y
live-text. Distinct color/fill columns still appear.

Migration: none
