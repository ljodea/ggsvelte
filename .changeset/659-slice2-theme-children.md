---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: theme children + deprecate GGPlot `theme` prop

Ship declaration-only `<Theme>` / `<ThemeDark>` / … children (stable-intent),
fold non-mark plot layers after props so children win, and deliver a
once-per-instance `DEPRECATED_PLOT_PROP` advisory through `ondiagnostic`
(`PlotDiagnostic` union). Rename `LayerDescriptor` → `MarkLayerDescriptor`
(deprecated type alias kept until 0.13.0).

Migration: <https://ggsvelte.sh/guide/upgrading#compose-the-theme-as-a-child-layer>
