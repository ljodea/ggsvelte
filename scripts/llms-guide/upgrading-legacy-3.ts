/**
 * Legacy release notes, part 3 (0.8 back to 0.1).
 */

export const UPGRADING_LEGACY_3_MD = `## 0.8 to 0.9

### Constrain the data rectangle instead of the outer box

Before 0.9, CSS \`aspect-ratio\` on a chart wrapper constrained the complete SVG.
Axes, titles, and guides still changed the inner panel ratio, so equal data
units could render at unequal physical lengths:

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomLine } from "@ggsvelte/svelte";

  // Before 0.9, an outer CSS aspect ratio could not preserve data-unit lengths
  // after axes, titles, and guides consumed chart space.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<div style="aspect-ratio: 1">
  <GGPlot data={circle} aes={{ x: "x", y: "y" }}>
    <GeomLine />
  </GGPlot>
</div>
\`\`\`

Since 0.9, remove that wrapper workaround and author the coordinate directly:

\`\`\`svelte fragment
<script lang="ts">
  import { CoordFixed, GGPlot, GeomLine } from "@ggsvelte/svelte";

  // Since 0.9, constrain the measured data rectangle instead of the outer box.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<GGPlot data={circle} aes={{ x: "x", y: "y" }}>
  <GeomLine />
  <CoordFixed />
</GGPlot>
\`\`\`

\`coordFixed({ ratio: 1 })\` measures the trained data rectangle after chart
chrome is allocated and letterboxes it without distortion. Fixed aspect now
rejects \`facet.scales\` values \`"free"\`, \`"free_x"\`, and \`"free_y"\`; switch those
facets to \`"fixed"\` or remove the fixed coordinate rather than presenting a
false shared physical scale.

## 0.6 to 0.7

### Choose explicit color/fill families

Color/fill now exposes complete continuous, discrete, binned, transformed,
temporal, manual, and identity helpers. Existing \`ordinal\` and \`sequential\`
JSON remains canonical. Review charts that relied on implicit continuous
clamping: with an explicit domain, the default \`oob: "censor"\` now uses
\`unknownValue\`; opt into \`oob: "squish"\` to clamp deliberately.

Use \`type: "binned"\` plus semantic \`breaks\` for colorsteps. Manual scales
require one range color per explicit domain value and never recycle extras.
Identity scales accept validated hex source values and suppress their guide by
default. Replace ad-hoc preprocessing with \`scaleColorDate\`/
\`scaleColorDatetime\` and an explicit parser when date order is ambiguous.

Before 0.7, an explicit continuous color domain clamped implicitly:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { x: 1, y: 2, score: -10 },
    { x: 2, y: 3, score: 50 },
    { x: 3, y: 4, score: 110 },
  ];
</script>

<Plot
  data={rows}
  aes={{ x: "x", y: "y", color: "score" }}
  scales={{ color: { type: "sequential", domain: [0, 100] } }}
>
  <GeomPoint />
</Plot>
\`\`\`

In 0.7, opt into clamping when it is the intended encoding:

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    ScaleColorContinuous,
  } from "@ggsvelte/svelte";

  const rows = [
    { x: 1, y: 2, score: -10 },
    { x: 2, y: 3, score: 50 },
    { x: 3, y: 4, score: 110 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "x", y: "y", color: "score" }}>
  <GeomPoint />
  <ScaleColorContinuous domain={[0, 100]} oob="squish" />
</GGPlot>
\`\`\`

\`RenderModel.guidePlans\` now includes serializable \`discrete\`, \`colorbar\`,
and \`colorsteps\` plans beside axes. Code that assumed every plan was an axis
must narrow on \`plan.type === "axis"\` before reading axis-only fields.

## 0.5 to 0.6

### Move position transforms before statistics

Position transforms now follow ggplot2 staging: parsing, source-limit OOB, and
the scale transform happen before statistics and positions. The old late
projection produced incorrect smooths, bins, densities, summaries, and
boxplots. This is the pre-1.0 semantic-correctness exception in decision 0015;
there is no legacy staging switch.

Authored \`type: "log"\` still validates, but canonical specs now store
\`type: "linear", transform: "log10"\`. Prefer the explicit transform or
\`scaleXLog10\`/\`scaleYLog10\` helpers. A codemod would only rewrite spelling
and cannot decide whether changed statistics are intended, so migration remains
a manual chart review.

Before 0.6, this fit used the old late log projection:

\`\`\`svelte fragment
<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "@ggsvelte/svelte";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<Plot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={{ x: { type: "log", domain: [1, 1000] } }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</Plot>
\`\`\`

In 0.6, make the pre-stat transform and limit policy explicit, then compare the
fit with the intended analysis. The zero expansion below restores flush bounds;
the new default for non-temporal continuous and binned scales is 5%
multiplicative display expansion, including pinned domains.

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    ScaleXLog10,
  } from "@ggsvelte/svelte";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "latency", y: "throughput" }}>
  <GeomPoint />
  <GeomSmooth method="lm" />
  <ScaleXLog10
    domain={[1, 1000]}
    oob="censor"
    expand={{ mult: 0, add: 0 }}
    nice={false}
  />
</GGPlot>
\`\`\`

### Review limits, zoom, and transformed units

A pinned \`domain\` is now an unexpanded source limit. The default
\`oob: "censor"\` removes out-of-limit values before stats;
\`oob: "squish"\` clamps them before transform/stats. Brush zoom writes a
semantic domain with \`nice: false\` and zero expansion, so it intentionally
re-runs stats on the zoomed subset rather than acting like a post-stat
coordinate crop. Use a wider scale domain or squish only when that is the
intended analysis; a future coordinate-transform API owns visual-only zoom.

Position offsets and stack totals are transformed-space units. Under log10 or
sqrt, numeric \`stat_bin\` \`binwidth\`, \`boundary\`, and \`center\` are also
transformed-space units: for example log10 \`boundary: 0\` means semantic 1,
not \`log10(0)\`.

### Update scale and interaction inspection

Continuous log10/sqrt scales no longer report trained \`type: "log"\`.
\`RenderModel.scales\`, \`AxisGuidePlan\`, interval selections, and precise
bounds use family-plus-transform contracts:

\`\`\`text fragment
scale type / guide scaleType / interval kind: "linear"
transform: "identity" | "log10" | "sqrt"
\`\`\`

Reject or migrate transient snapshots containing \`kind: "log"\`; pre-1.0
interaction snapshots do not have a compatibility branch. Keep semantic
source-space domains and apply the named transform exactly once.

## 0.2 to 0.3

### Replace custom hit indexes with CandidateStore

The experimental \`buildHitIndex\` export and its \`SceneHitIndex\` types have been
removed. Every render model already owns a lazy \`CandidateStore\` with the same exact
geometry hit behavior, so custom browser hosts no longer build and retain a second
spatial index.

Before 0.3:

\`\`\`ts fragment
import { buildHitIndex } from "@ggsvelte/core/dom";

const hitIndex = buildHitIndex(model.scene);
const hit = hitIndex.hitTest(plotX, plotY);
\`\`\`

In 0.3, use the model-owned candidate identity directly. \`hitTest()\` follows
paint order, honors panel clipping, and returns \`CandidateFacts\`. Rectangle
queries remain available as \`model.candidates.queryRect(...)\` candidate ids.

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Inspect,
    type RenderModel,
  } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", x: 1, y: 3 },
    { id: "b", x: 2, y: 4 },
  ];
  let model = $state<RenderModel | null>(null);
  let hitRow = $state<number | null>(null);

  function inspectPlotPixel(x: number, y: number): void {
    hitRow = model?.candidates.hitTest(x, y)?.rowIndex ?? null;
  }
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y" }}
  key="id"
  onrender={(next) => (model = next)}
>
  <GeomPoint />
  <Inspect />
</GGPlot>

<button type="button" onclick={() => inspectPlotPixel(100, 100)}>
  Resolve plot pixel
</button>
<p>{hitRow === null ? "No hit" : \`Row \${hitRow}\`}</p>
\`\`\`

For a separately constructed scene, call \`buildCandidateStore(scene, {
hitTolerance })\` from \`@ggsvelte/core\`. The old tolerance default remains 3
plot pixels.

## 0.1 to 0.2

No source changes are required: every 0.1 prop, callback, and export keeps
working in 0.2. One environment requirement changed: the \`svelte\` peer
dependency floor rose from \`^5.29.0\` to \`^5.33.1\`, so upgrade Svelte first.
The additions below are optional to adopt.

### Optional: shared interaction state with a controller

0.2 adds \`createPlotInteraction\` for linked views: selection, emphasis, and
zoom state shared across plots, controls, and tables. Chart-local props and
callbacks remain fully supported — reach for a controller only when more than
one surface consumes the same interaction state.

Chart-local (unchanged from 0.1):

\`\`\`svelte fragment
<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    type PlotSelection,
  } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  let selection = $state<PlotSelection<string> | null>(null);
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  onselect={(event) => (selection = event)}
>
  <GeomPoint />
</GGPlot>

<p>{selection === null ? 0 : selection.keys.length} selected</p>
\`\`\`

Shared controller (new in 0.2, optional):

\`\`\`svelte fragment
<script lang="ts">
  import {
    createPlotInteraction,
    GeomPoint,
    GGPlot,
  } from "@ggsvelte/svelte";

  const rows = [
    { id: "a", flipper: 181, mass: 3750, species: "Adelie" },
    { id: "b", flipper: 195, mass: 3800, species: "Chinstrap" },
    { id: "c", flipper: 217, mass: 4500, species: "Gentoo" },
  ];
  const scope = { keys: "row-id", x: "flipper-mm", y: "mass-g" } as const;
  const interaction = createPlotInteraction<string>();
  const selected = $derived(interaction.selected(scope));
</script>

<GGPlot
  data={rows}
  aes={{ x: "flipper", y: "mass", color: "species" }}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
>
  <GeomPoint />
</GGPlot>

<p>{selected.length} selected</p>
\`\`\`

See the [linked views example](/examples/interaction/linked-views) and
[Interactions](/guide/interactions) for the full controller contract.

### Deprecated type aliases

Unchanged in 0.2: these pre-0.1 names have been deprecated since 0.1.0 and
still compile. Replace them when convenient:

- \`BrushSelection\` → \`IntervalSelection\`
- \`TooltipContext\` → \`PlotInspectionChange\`
- \`ZoomDomains\` → \`ReadonlyZoomDomains\`

See [Interactions](/guide/interactions) for current options, event shapes,
and identity requirements.
`;
