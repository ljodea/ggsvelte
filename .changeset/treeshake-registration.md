---
"@ggsvelte/core": minor
"@ggsvelte/svelte": minor
---

# Tree-shaken registration: GGPlot apps bundle only declared geoms/stats

Migration: <https://ggsvelte.sh/guide/upgrading#explicit-registration-for-spec-driven-charts>

The `@ggsvelte/core` barrel no longer registers every stat frame builder and geom batch at module scope, and no longer installs Temporal on import. Registration is explicit:

- `registerAll()` — full grammar + Temporal + interaction candidates (one-call pre-0.27 behavior), re-exported from `@ggsvelte/svelte`.
- `registerBasic()` — identity-chart tier (what `@ggsvelte/core/render` still installs on import).
- Per-family `registerSmooth()` / `registerBoxplot()` / … — granular opt-in; each generated `<Geom*>` component calls its own in a `<script module>` block, so importing a component is what pulls its code into the bundle.

GGPlot registers basic geoms/stats + Temporal by default, so component-driven apps (including histograms, smooth, sf, … via `<Geom*>` children) need no change and now tree-shake every specialty geom/stat they do not declare. A Vite consumer rendering a point/line chart no longer bundles smooth/density_2d/sf/contour/violin/hex/boxplot code (CI-enforced via bundle attribution).

**Breaking (pre-1.0):** spec-driven charts (`layers` prop, `spec`, or headless `runPipeline` / `renderToSVGString`) using specialty geoms/stats must call `registerAll()` once (or a per-family register function). A `stat="…"` override on a component child needs that stat's family register call too — the component registers only its default stat. Missing registration fails loudly with a "not registered in this build" error naming the fix. `ggsvelte-render` (CLI) registers the full grammar itself — no change.
