---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

refactor: one capability resolution seam behind the layer registry

Internal only — no public API or behavior change. Legend focus/filter
resolution shares one channel-capability core; the plot engine reads
inspect/legendFocus/legendFilter through a single resolution factory with
three independent SSR-safe deriveds, and advisory delivery goes through one
once-per-diagnostic helper.
