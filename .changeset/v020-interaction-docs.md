---
"@ggsvelte/svelte": patch
---

<!-- markdownlint-disable MD041 -->

docs(skill): teach v0.20 Inspect / GuideLegend interaction API

Agent skill and site copy preferred the deprecated GGPlot `inspect`,
`legendFocus`, and `legendFilter` props. Prefer `<Inspect>` and
`<GuideLegend channel focus|filter />` in skill fences, homepage JSON, and
the guides reference. Gallery examples already use the children; a contract
test keeps them that way.

Migration: none — teaching only.
