/**
 * Legacy release notes, part 2 (0.10 back to 0.7).
 */

export const UPGRADING_LEGACY_2_MD = `## 0.10 to 0.11

### Compose the theme as a child layer

The \`theme\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose the theme as a declaration-only child — named shells
for every built-in theme, or the generic \`<Theme>\` escape hatch for dynamic
names and role overrides.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- Before 0.11: theme was a top-level GGPlot prop. -->
<Plot data={rows} aes={{ x: "x", y: "y" }} theme="dark">
  <GeomPoint />
</Plot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot, ThemeDark } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- After 0.11: compose the theme as a declaration-only child layer. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }}>
  <GeomPoint />
  <ThemeDark />
</GGPlot>
\`\`\`

\`LayerDescriptor\` was renamed to \`MarkLayerDescriptor\` in 0.11.0 and the
alias was removed in 0.13.0.

### Compose scales as child layers

The \`scales\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose scales as declaration-only children — named shells
for every color/fill helper (\`<ScaleColorDiscrete/>\`, \`<ScaleFillManual/>\`,
British \`Colour\` aliases, …), or the generic \`<Scale value={…}>\` escape hatch
for raw fragments and computed scales. Two children on one channel emit a
\`DUPLICATE_SCALE_CHANNEL\` advisory (last child still wins).

Named shells route through the matching helpers, so migrating a raw fragment
like \`scales={{color:{scheme:"colorblind"}}}\` to
\`<ScaleColorDiscrete scheme="colorblind"/>\` adds \`type:"ordinal"\` to the
PortableSpec (rendering is unchanged). Use \`<Scale value={…}>\` when you need
byte-identical PortableSpec.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    scaleColorDiscrete,
  } from "@ggsvelte/svelte";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- Before 0.11: scales was a top-level GGPlot prop. -->
<Plot
  data={rows}
  aes={{ x: "x", y: "y", color: "c" }}
  scales={scaleColorDiscrete({ scheme: "colorblind" })}
>
  <GeomPoint />
</Plot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    ScaleColorDiscrete,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, c: "a" },
    { x: 2, y: 4, c: "b" },
  ];
</script>

<!-- After 0.11: compose scales as declaration-only child layers. -->
<GGPlot data={rows} aes={{ x: "x", y: "y", color: "c" }}>
  <GeomPoint />
  <ScaleColorDiscrete scheme="colorblind" />
</GGPlot>
\`\`\`

\`PlotDiagnostic\` also widens to include \`CompositionDiagnostic\`
(\`DUPLICATE_SCALE_CHANNEL\`, \`DUPLICATE_PLOT_LAYER\`). Exhaustive \`switch\` on
\`.code\` needs new arms; handlers annotated \`PlotDiagnostic\` keep compiling.

### Compose coord as a child layer

The \`coord\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose the coordinate system as a declaration-only child —
\`<CoordFlip/>\`, \`<CoordFixed/>\` / \`<CoordEqual/>\`, \`<CoordTransform/>\`,
\`<CoordCartesian/>\`, or the generic \`<Coord value={…}>\` escape hatch. Two
coord children emit a \`DUPLICATE_PLOT_LAYER\` advisory (last child still wins).

### Compose facet as a child layer

The \`facet\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose facets as declaration-only children — \`<FacetWrap
field="g"/>\`, \`<FacetGrid rows="a" cols="b"/>\`, or the complete
\`<Facet wrap={…} />\` surface. Keep \`strip\` nested
(\`strip={{position,show}}\`). Two facet children emit a
\`DUPLICATE_PLOT_LAYER\` advisory (last child still wins). Bare \`<Facet/>\`
with no wrap/rows/cols fails validation (\`facet-form-missing\`).

### Compose labs as a child layer

The \`labs\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose labels as a declaration-only child —
\`<Labs title="Sales" subtitle="FY25" x="Quarter" color="Region"/>\`. There is
no \`<Labs value={…}>\` escape hatch because Labs is a flat bag of strings:
\`<Labs {...computed} />\` already covers the computed case.

labs is a MERGE family: two \`<Labs/>\` children setting different keys both
survive. Two children setting the SAME key emit a \`DUPLICATE_MERGE_KEY\`
advisory and the later one wins.

### Compose guides as child layers

The \`guides\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Guides are keyed by aesthetic, so the child form is one shell per
guide TYPE taking a \`channel\` prop — the aesthetic is a key, never part of the
component name: \`<GuideAxis channel="x" showTicks={false}/>\`,
\`<GuideLegend channel="color" position="bottom"/>\`,
\`<GuideColorbar channel="fill"/>\`, \`<GuideColorsteps channel="color"/>\`,
\`<GuideNone channel="size"/>\`, plus \`<Guides value={…}>\` for raw or computed
guide bags.

guides is a MERGE family keyed by channel, but the value AT a channel is
replaced whole. Two guide children on one channel emit a
\`DUPLICATE_MERGE_KEY\` advisory (last child still wins). A top-level guide
child still wins over a scale-local \`guide\` on the same channel.

The shells carry no scale knowledge and do not guess: \`<GuideColorbar/>\` over
a discrete color scale fails loudly rather than silently degrading to a legend.

### Compose legend as a child layer

The \`legend\` prop on \`<GGPlot>\` was deprecated in 0.11.0 and **removed in
0.13.0**. Compose it as \`<Legend order="sorted"/>\`.

\`<Legend order>\` is the plot-wide entry-SORT enum
(\`"stable-domain"\` | \`"present-first-seen"\` | \`"sorted"\`); ordering never
changes color assignments. It is NOT \`<GuideLegend order={2}/>\`, which is a
per-aesthetic INTEGER placement rank. Same word, unrelated concepts — the two
compose independently on one plot.

### Migrate the grammar props with the codemod

All seven grammar props above move mechanically, so \`@ggsvelte/svelte\` ships a
codemod. It is opt-in and prints a diff by default — it writes nothing until
you pass \`--write\`:

\`\`\`bash complete
# see what would change
npx ggsvelte-codemod src

# apply it
npx ggsvelte-codemod --write src
\`\`\`

It rewrites \`facet\`, \`coord\`, \`scales\`, \`guides\`, \`legend\`, \`theme\` and
\`labs\` into their child layers and adds the components to the
\`@ggsvelte/svelte\` import that already provided \`GGPlot\`. Migrated children are
inserted BEFORE any child the file already had, because props apply before
children — so a hand-written \`<ScaleColorDiscrete/>\` keeps winning over a
migrated \`scales\` prop exactly as it did before.

The rewrite is meaning-preserving, never a style rewrite. It targets the
generic escape hatches (\`<Coord value={…}/>\`, \`<Scale value={…}/>\`,
\`<Guides value={…}/>\`) rather than the named shells this guide recommends by
hand: for scales the named form is not byte-identical (\`normalize()\` does not
infer a scale \`type\`), so choosing it is a judgment call the tool does not
make for you. Flat prop bags become named props —
\`labs={{ title: "Sales" }}\` → \`<Labs title="Sales"/>\` — falling back to
\`<Labs {...expr}/>\` for anything it cannot expand losslessly.

One shape is deliberately left alone: \`theme={expr}\` where \`expr\` is not a
string literal. \`theme\` accepts \`ThemeName | ThemeSpec\` and \`<Theme>\` has no
\`value\` hatch, so routing a dynamic value needs a human. Those sites are
printed as \`manual change required\` with a link back to this guide — the tool
reports them rather than half-migrating them.

Two more things worth knowing: the codemod only touches files that import
\`GGPlot\` from \`@ggsvelte/svelte\` (a \`GGPlot\` of your own is never rewritten),
and it edits only the ranges it changes, so run your formatter afterwards if
you keep multi-line open tags.

### Diagnostic handlers receive \`PlotDiagnostic\`

\`ondiagnostic\` now receives the \`PlotDiagnostic\` union
(\`InteractionDiagnostic | DeprecationDiagnostic\`). Explicitly annotated
handlers that named \`InteractionDiagnostic\` alone need a one-line type
widening; inline arrow props continue to infer.

Before:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type {
    InteractionDiagnostic,
    PlotDiagnostic,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function legacy(diagnostic: InteractionDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }

  // @ts-expect-error Pre-0.11 InteractionDiagnostic-only handlers are not assignable to PlotDiagnostic.
  const ondiagnostic: (diagnostic: PlotDiagnostic) => void = legacy;
</script>

<!-- Before 0.11: ondiagnostic was typed as InteractionDiagnostic only. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
\`\`\`

After:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { PlotDiagnostic } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  function ondiagnostic(diagnostic: PlotDiagnostic): void {
    console.warn(diagnostic.code, diagnostic.message);
  }
</script>

<!-- After 0.11: ondiagnostic receives PlotDiagnostic (interaction ∪ deprecation). -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }} {ondiagnostic}>
  <GeomPoint />
</GGPlot>
\`\`\`

## 0.7 to 0.8

### Map style semantics instead of precomputing outputs

Mapped \`size\`, \`linewidth\`, and \`alpha\` now train and render complete
scales. \`shape\` and \`linetype\` now use closed finite symbol sets. Remove
application-side radius, opacity, stroke-width, and dash lookup columns when
they only existed to compensate for ignored style mappings. Map the semantic
source field and select a scale family instead.

Before 0.8, applications commonly precomputed a point radius and passed it
through identity:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  // Before 0.8, applications precomputed symbol radii.
  const rows = [
    { x: 1, y: 2, radius: 2 },
    { x: 2, y: 3, radius: 5 },
    { x: 3, y: 4, radius: 9 },
  ];
</script>

<Plot
  data={rows}
  aes={{ x: "x", y: "y", size: "radius" }}
  scales={{ size: { type: "identity" } }}
>
  <GeomPoint />
</Plot>
\`\`\`

In 0.8, keep the source measure and let the scale interpolate in symbol area:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    ScaleSizeContinuous,
  } from "@ggsvelte/svelte";

  // In 0.8, map the semantic measure and let size interpolate in symbol area.
  const rows = [
    { x: 1, y: 2, magnitude: 4 },
    { x: 2, y: 3, magnitude: 25 },
    { x: 3, y: 4, magnitude: 81 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", size: "magnitude" }}>
  <GeomPoint />
  <ScaleSizeContinuous range={[2, 9]} />
</GGPlot>
\`\`\`

Review implicit grouping on line, area, smooth, errorbar, and boxplot layers.
Discrete and binned style mappings now split groups, as color/fill mappings do;
continuous numeric styles do not. If a discrete style is descriptive rather
than structural, author an explicit \`group\` mapping. Shape/linetype do not
silently interpolate quantitative values: use \`type: "binned"\` or move the
measure to a numeric style channel.

A mapped \`alpha\` is now the complete authored opacity aesthetic; it is not
multiplied by a competing scalar geom \`alpha\` parameter. Remove that scalar
parameter and set the mapped scale's \`range\` when you need a lower opacity
ceiling.

### Move guide layout into the guide API

Automatic non-position guides now move below the chart when the viewport is at
most 480px or a right guide would leave less than 320px of readable panel.
Bottom colorbars/colorsteps are horizontal and discrete keys wrap without
shrinking text. If an application positioned or hid the old fixed right legend
with surrounding CSS, remove that workaround and author portable guide intent:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomPoint } from "@ggsvelte/svelte";

  // Before 0.8, automatic legends always occupied the fixed right column.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", color: "region" }}>
  <GeomPoint />
</GGPlot>
\`\`\`

In 0.8, declare the alternate presentation directly:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomPoint, GuideLegend } from "@ggsvelte/svelte";

  // Since 0.8, guide presentation is portable and responsive without changing scale math.
  const rows = [
    { x: 1, y: 2, region: "North" },
    { x: 2, y: 3, region: "South" },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", color: "region" }}>
  <GeomPoint />
  <GuideLegend channel="color" position="bottom" direction="horizontal" />
</GGPlot>
\`\`\`

Top-level \`guides\` override scale-local \`guide\` settings. Use
\`guideNone()\` for suppression and \`force: true\` only when an identity or
single-value manual guide is intentional. Guide appearance does not alter scale
domains or assignments. Exact discrete entries remain focus/filter targets;
numeric guide ticks and bins remain representative and non-interactive.

`;
