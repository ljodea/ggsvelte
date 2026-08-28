/**
 * Legacy release notes, part 1 (0.26 back to 0.12).
 */

export const UPGRADING_LEGACY_1_MD = `## 0.26 to 0.27

### Explicit registration for spec-driven charts

Apps that declare layers with components (\`<GeomPoint>\`, \`<GeomSmooth>\`, …)
need **no change**: each component now registers its own geom batch and
default stat on import, and GGPlot bundles only the geoms and stats a chart
declares. Identity charts (point, line, path, col, bar, area, rule, hline,
vline, text, label, rect, ribbon, segment, count, blank, jitter, step) work
out of the box as before.

Apps that drive GGPlot with a \`layers\` prop or a \`spec\`, or call
\`runPipeline\` / \`renderToSVGString\` directly, must register specialty
geoms/stats (smooth, boxplot, violin, hex, contour, density_2d, sf, qq, …)
explicitly. A missing registration fails loudly: \`Geom "smooth" is not
registered in this build. Call registerAll() …\`.

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
  ];
</script>

<!-- Before 0.27: any geom worked from the layers prop — the core barrel
     bundled and registered the full grammar for every app. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "smooth" }]}
  width={480}
  height={320}
/>
\`\`\`

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, registerAll } from "@ggsvelte/svelte";

  // After 0.27: spec-driven charts (layers prop / spec, no <Geom*> components
  // to self-register) opt into the full grammar once at app startup. Component
  // children need no call — they self-register on import.
  registerAll();

  const rows = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  layers={[{ geom: "smooth" }]}
  width={480}
  height={320}
/>
\`\`\`

- Prefer one \`registerAll()\` at app startup for the pre-0.27 "full grammar"
  behavior — grammar + Temporal + interaction candidates (also re-exported
  from \`@ggsvelte/svelte\`).
- Prefer a per-family call (\`registerSmooth()\`, \`registerBoxplot()\`, …, from
  \`@ggsvelte/core\`) for granular opt-in without the full grammar.
- Overriding \`stat\` to a specialty stat (e.g.
  \`<GeomPoint stat="density_2d" />\`) needs that stat's register call too —
  the component registers only its default stat.
- Direct \`@ggsvelte/core\` barrel importers: the barrel is side-effect-free
  now — \`registerAll()\` restores pre-0.27 import-time registration. The lean
  \`@ggsvelte/core/render\` entry is unchanged (basic registration on import).

### Skill moved to @ggsvelte/skill

The agent skill (\`SKILL.md\` + \`references/\`) no longer ships inside
\`@ggsvelte/svelte\`. It is its own package, \`@ggsvelte/skill\`, versioned in
lock-step with the rest of ggsvelte — the package root IS the skill directory:

\`\`\`sh fragment
npm install --save-dev @ggsvelte/skill
# then copy or symlink it into your agent's skills directory:
cp -R node_modules/@ggsvelte/skill .claude/skills/ggsvelte
\`\`\`

Or point agents at the stable path
\`node_modules/@ggsvelte/skill/SKILL.md\` directly. Re-copy on every version
bump; dependabot (or npm-check-updates) surfaces those bumps now. Any checkout
that previously read \`node_modules/@ggsvelte/svelte/skills/ggsvelte/\` must
switch — that directory is gone.

## 0.22 to 0.23

### CLI moved to @ggsvelte/cli

The \`ggsvelte-render\` bin no longer ships with \`@ggsvelte/svelte\`. It is
its own package, \`@ggsvelte/cli\`, with no Svelte dependency — install it
wherever the command runs (agent sandboxes above all):

\`\`\`sh fragment
npm install -g @ggsvelte/cli
# or add @ggsvelte/cli as a dependency of the project that invokes it
\`\`\`

The command name, flags, exit codes, and JSONL diagnostics are unchanged.
\`ggsvelte-codemod\` still ships with \`@ggsvelte/svelte\`. If a sandbox image
or CI step ran \`ggsvelte-render\` via the Svelte package's bin, add
\`@ggsvelte/cli\` there before upgrading \`@ggsvelte/svelte\`.

## 0.20 to 0.21

### Row identity on interaction

Durable row identity no longer belongs on the grammar root. Ordinary charts
omit identity entirely: the engine uses an \`id\` column when present, otherwise
the **row index** (order-stable only — not reorder-safe across data refresh).

Custom durable identity (non-\`id\` natural keys, composite accessors, pin
rebind across reorder) lives on interaction surfaces:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, Inspect } from "@ggsvelte/svelte";

  const rows = [
    { country: "Japan", year: 812, temp: 6.1 },
    { country: "Korea", year: 900, temp: 5.8 },
  ];
</script>

<!-- Before 0.21: plot-level key. -->
<GGPlot data={rows} aes={{ x: "year", y: "temp" }} key="country">
  <GeomPoint />
  <Inspect />
</GGPlot>
\`\`\`

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, Inspect } from "@ggsvelte/svelte";

  const rows = [
    { country: "Japan", year: 812, temp: 6.1 },
    { country: "Korea", year: 900, temp: 5.8 },
  ];
</script>

<!-- After 0.21: identity on Inspect (or select / createPlotInteraction). -->
<GGPlot data={rows} aes={{ x: "year", y: "temp" }}>
  <GeomPoint />
  <Inspect identity="country" />
</GGPlot>
\`\`\`

- Prefer \`<Inspect identity="…" />\` or \`inspect={{ identity: "…" }}\` when
  inspect is enabled.
- Prefer \`select={{ type: "point", identity: "…" }}\` (or interval) when
  selection owns the key without inspect.
- Prefer \`createPlotInteraction({ identity: "…" })\` when linked plots share
  one controller and the same identity field.
- Resolution order: Inspect → Select → controller → deprecated \`key\` →
  auto \`id\` → row index.
- \`<GGPlot key>\` still dual-reads through 0.21.x and emits
  \`DEPRECATED_PLOT_PROP\`; it is removed in 0.22.0.

## 0.18 to 0.19

### Legend focus on GuideLegend

Discrete legend focus is no longer a plot-host capability prop. Opt in on the
guide child that owns the aesthetic:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- Before 0.19: legendFocus was a plot-host prop. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "series" }}
  key="id"
  legendFocus
>
  <GeomPoint />
</GGPlot>
\`\`\`

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, GuideLegend } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- After 0.19: focus lives on GuideLegend for that aesthetic. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "series" }} key="id">
  <GeomPoint />
  <GuideLegend channel="color" focus />
</GGPlot>
\`\`\`

- \`focus\` accepts \`true\` or \`{ preview?: boolean }\` (same shape as the old
  plot prop). It is host-only — not a PortableSpec / \`guideLegend()\` field.
- Only channels with an active \`<GuideLegend focus>\` get interactive legend
  targets. Enable multiple aesthetics with multiple GuideLegend children.
- A focus-only GuideLegend (no presentation options) does not force
  \`type: "legend"\`, so continuous colour scales keep their colorbar.
- \`<GGPlot legendFocus>\` still works plot-wide through 0.19.x and emits
  \`DEPRECATED_PLOT_PROP\`; it is removed in 0.20.0.
- Handlers stay plot-level: \`onlegendfocus\`, \`oninteraction\`, and \`key\`.

### Legend filter on GuideLegend

Discrete legend filter is no longer a plot-host capability prop. Opt in on the
guide child that owns the aesthetic:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- Before 0.19: legendFilter was a plot-host prop. -->
<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "series" }}
  key="id"
  legendFilter
>
  <GeomPoint />
</GGPlot>
\`\`\`

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, GuideLegend } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 2, series: "North" },
    { id: "b", x: 2, y: 3, series: "South" },
  ];
</script>

<!-- After 0.19: filter lives on GuideLegend for that aesthetic. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "series" }} key="id">
  <GeomPoint />
  <GuideLegend channel="color" filter />
</GGPlot>
\`\`\`

- \`filter\` accepts \`true\` or \`{ mode?, multiple? }\` (same shape as the old
  plot prop). It is host-only — not a PortableSpec / \`guideLegend()\` field.
- Only channels with an active \`<GuideLegend filter>\` get filter checkboxes.
  Enable multiple aesthetics with multiple GuideLegend children.
- A filter-only GuideLegend (no presentation options) does not force
  \`type: "legend"\`, so continuous colour scales keep their colorbar.
- \`<GGPlot legendFilter>\` still works plot-wide through 0.19.x and emits
  \`DEPRECATED_PLOT_PROP\`; it is removed in 0.20.0.
- Handlers stay plot-level: \`onlegendfilter\`, \`oninteraction\`, and \`key\`.
- Focus and filter coexist on one GuideLegend:
  \`<GuideLegend channel="color" focus filter />\`.

## 0.11 to 0.12

### Manual color domain/range diagnostic code

Validation used to emit the code \`scale-manual-domain-range\` when a manual
color/fill scale had mismatched domain and range lengths. It now emits
\`color-manual-domain-range\` — the same string the pipeline already used —
so agents and the error-reference page have one name for that fault.

If your tooling matches \`SpecError.code\` or docs anchors by string, update:

- code: \`scale-manual-domain-range\` → \`color-manual-domain-range\`
- docs anchor: \`#scale-manual-domain-range\` → \`#color-manual-domain-range\`
  (pipeline entry is now \`#color-manual-domain-range-pipeline\` when both
  sources appear on the page)

Pipeline-only and validation-only catalogs remain separate objects, but dual
codes share one prose source in \`@ggsvelte/spec\`. \`PIPELINE_ERROR_CATALOG\`
is also exported from \`@ggsvelte/spec\` (and still re-exported from
\`@ggsvelte/core\`).

## 0.12 to 0.13

### Grammar props removed from \`<GGPlot>\`

The seven grammar props deprecated in 0.11.0 — \`theme\`, \`scales\`, \`coord\`,
\`facet\`, \`labs\`, \`guides\`, and \`legend\` — are **removed** from
\`<GGPlot>\` in 0.13.0. Compose them only as declaration-only children. The
\`ggsvelte-codemod\` still rewrites old source that uses the prop form.

\`LayerDescriptor\` is removed; use \`MarkLayerDescriptor\`.

### \`normalize()\` returns the post-normalize geom union

\`normalize()\` rewrites five convenience geoms to a canonical name —
\`histogram\` to \`bar\`, \`freqpoly\` to \`line\`, \`jitter\` to \`point\`,
\`hline\` and \`vline\` to \`rule\`. Its declared return type used to name all
49 geoms anyway, so nothing could tell which 44 actually reach the pipeline.

It now returns \`NormalizedSpec\`, whose layers are \`NormalizedLayerSpec\` —
the same shape, minus the five names normalize has already removed. Alongside
it, \`@ggsvelte/spec\` exports \`ALIAS_GEOMS\`, \`GEOM_ALIASES\`,
\`AliasGeomName\` and \`NormalizedGeomName\`.

Authored specs are unaffected: \`PortableSpec\` and the published JSON Schema
still accept every one of the 49 names, and \`geom: "histogram"\` works exactly
as before.

One kind of caller changes. Code that reads geoms back off a normalized spec
and expects all 49 now sees 44:

\`\`\`ts fragment
// Before — the "histogram" arm was reachable in the type, never at runtime.
const spec: PortableSpec = normalize(input);
for (const layer of spec.layers) {
  if (layer.geom === "histogram") { /* dead branch */ }
}

// After — narrow before normalize, or drop the branch.
const spec = normalize(input); // NormalizedSpec
for (const layer of spec.layers) {
  if (layer.geom === "bar") { /* what histogram became */ }
}
\`\`\`

Annotating the result as \`PortableSpec\` still compiles, so passing a
normalized spec on to anything that takes one needs no change.

`;
