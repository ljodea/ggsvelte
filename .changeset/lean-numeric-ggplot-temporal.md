---
"@ggsvelte/svelte": minor
---

Stop installing the Temporal polyfill in every `GGPlot` bundle. Temporal scale children now install full Temporal support; spec- and `layers`-driven temporal charts must call `installTemporal()` or `registerAll()` at startup.

Migration: <https://ggsvelte.sh/guide/upgrading#explicit-temporal-registration-for-spec-driven-charts>
