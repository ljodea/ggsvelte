---
"@ggsvelte/spec": minor
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
"@ggsvelte/skill": patch
---

<!-- markdownlint-disable MD041 -->

feat: stat_summary_rolling centered rolling-window summaries

Add `stat: "summary_rolling"` on line and point layers: one output row per
(group, unique x), summarizing y over the centered window
|x − center| ≤ params.window/2. `params.window` (x data units, > 0) is
required — the spec validator raises `summary-rolling-window-required` with a
named fix and the core stat throws as the pipeline backstop. `params.fun`
defaults to mean; pass "median" for a running median line. Partial windows
at the series ends are kept (divergence from zoo's default NA padding), so a
running line reaches both ends of the data. Windows never cross groups.

Component-form registration follows the #1420 contract: a `GeomLine` /
`GeomPoint` shell self-registers only its default stat, so a
`stat="summary_rolling"` override needs one `registerSummaryRolling()` call
at app startup (exported from `@ggsvelte/svelte` / `@ggsvelte/core`); spec-
driven surfaces call `registerAll()` as before. Missing registration fails
loudly with the register hint.

Migration: none — additive
