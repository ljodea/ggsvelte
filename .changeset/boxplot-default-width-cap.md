---
"@ggsvelte/core": patch
"@ggsvelte/spec": patch
---

<!-- markdownlint-disable MD041 -->

fix: boxplot default width matches ggplot2 and caps few-category slabs

Use ggplot2's 0.75 band-step fraction (not bar's 0.9) and, when `width` is
omitted, cap boxes at 15% of panel width so 2–3 category charts stay
distribution-shaped (#653). Explicit `params.width` still uses the uncapped
fraction.

Migration: none for callers who set `width`. Default-only plots with few
categories render narrower boxes.
