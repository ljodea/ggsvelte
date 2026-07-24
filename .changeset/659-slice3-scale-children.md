---
"@ggsvelte/svelte": minor
---

<!-- markdownlint-disable MD041 -->

feat: scale children (color/fill) + deprecate GGPlot `scales` prop

Ship declaration-only `<Scale>` / `<ScaleColor*>` / `<ScaleFill*>` / Colour
aliases (stable-intent), fold scale children after props so children win per
channel, deliver a once-per-instance `DEPRECATED_PLOT_PROP` advisory for the
`scales` prop, and emit `DUPLICATE_SCALE_CHANNEL` when two scale children
collide on one aesthetic. `PlotDiagnostic` widens to
`InteractionDiagnostic | DeprecationDiagnostic | CompositionDiagnostic`
(exhaustive `switch` on `.code` needs a new arm; annotated handlers keep
working).

Migration: <https://ggsvelte.sh/guide/upgrading#compose-scales-as-child-layers>
