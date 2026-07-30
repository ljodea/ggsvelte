---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: durable row identity on Inspect / Select / controller

Custom durable identity now prefers interaction surfaces:

- `<Inspect identity="…" />` or `inspect={{ identity: "…" }}`
- `select={{ type: "point" | "interval", identity: "…" }}`
- `createPlotInteraction({ identity: "…" })`

Resolution order: Inspect → Select → controller → deprecated GGPlot `key` →
auto `id` column → row index (order-stable only). Ordinary charts still omit
identity entirely.

`GGPlot key` dual-reads through 0.21.x and emits `DEPRECATED_PLOT_PROP`;
removal lands in 0.22.0.

Migration: <https://ggsvelte.sh/guide/upgrading#row-identity-on-interaction>
