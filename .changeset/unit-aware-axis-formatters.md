---
"@ggsvelte/core": patch
---

# Unit-aware temporal axisFormatters for pin and tooltip

Migration: none for authored labels — `dateLabels` / `labels` still override. **Default** tooltip header and floating crosshair axis labels now follow column precision (year → `1835`, month → `2024-07`, day → `2024-07-09`) instead of always stamping a calendar day or full datetime. Empty-space pins on year charts no longer show `1835-01-01`.

Axis tick **spacing** is unchanged; only the shared `axisFormatters` default pattern tracks the channel unit.
