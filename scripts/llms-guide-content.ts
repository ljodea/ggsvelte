/**
 * Guide section markdown — single source for docs pages AND llms surfaces.
 * Static/prose constants and the interaction reference index live here so
 * renderer and surface-builder edits do not collide with guide prose edits.
 */
import { SCALE_CAPABILITIES, TEMPORAL_PARSER_NAMES } from "@ggsvelte/spec";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../packages/svelte/src/lib/interaction/interaction";
import supportMatrix from "../support-matrix.json";
import {
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_PAGE_FILENAME,
  QUICKSTART_PAGE_SVELTE,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  quickstartLessonMarkdown,
} from "./quickstart";

// Guide sections (markdown; single source for docs pages AND llms surfaces)
// ---------------------------------------------------------------------------

export const GETTING_STARTED_MD = `# Getting started

Install, render one chart from a Svelte file, then add aes, layers, scales,
facets, theme, and inspect. The TypeScript builder and portable JSON form are
secondary surfaces for generation, validation, and headless export.

## Create a SvelteKit app

Node.js 22+ in an empty directory:

\`\`\`sh complete
npx sv create my-chart --template minimal --types ts --no-add-ons --install npm
cd my-chart
\`\`\`

Skip this section if the app already exists.

## Install ggsvelte

Use the app's package manager:

\`\`\`sh complete
npm install @ggsvelte/svelte
# or: pnpm add @ggsvelte/svelte
# or: bun add @ggsvelte/svelte
\`\`\`

\`@ggsvelte/spec\` and \`@ggsvelte/core\` are dependencies of the Svelte
package. Install them directly only for spec-only or headless use.

## Draw your first chart

\`${QUICKSTART_PAGE_FILENAME}\` (complete file)

\`\`\`svelte complete
${QUICKSTART_PAGE_SVELTE}
\`\`\`

Run the package manager's dev command and open the printed local URL. Omitted
width follows the container; default height is 400px. No chart CSS required.

## You have a chart

\`GGPlot\` owns the chart, \`data\` supplies rows, \`aes\` maps fields, and
\`GeomPoint\` is the first layer. Edit the rows or the \`x\` / \`y\` field names.

## Build the grammar one change at a time

${quickstartLessonMarkdown()}

If the chart is inside \`display: none\`, a zero-width grid track, or another
collapsed container, it stays not-ready until the container receives a
positive width. During server rendering it uses a deterministic 640 × 400
fallback, then measures the real container after hydration. A blank chart,
hydration warning, or TypeScript package mismatch is covered in the
[Errors reference](/guide/errors#quickstart-troubleshooting).

## Choose another surface only when you need it

### Fluent builder

TypeScript builder for programmatic specs (\`cars\` from the complete file):

\`\`\`ts fragment
${QUICKSTART_BUILDER_FRAGMENT}
\`\`\`

### PortableSpec JSON

PortableSpec for save, transmit, validate, or generate without executable
accessors. Equivalent to the first chart:

\`\`\`json fragment
${QUICKSTART_PORTABLE_SPEC_FRAGMENT}
\`\`\`

## Headless and server rendering

\`renderToSVGString\` is the pure no-DOM path. \`ggsvelte-render\` writes SVG to
stdout and JSON Lines diagnostics to stderr. Fragments below; pass the
PortableSpec above as \`spec\` or \`spec.json\`.

\`\`\`ts fragment
${QUICKSTART_HEADLESS_FRAGMENT}
\`\`\`

\`\`\`sh fragment
${QUICKSTART_CLI_FRAGMENT}
\`\`\`

## Validating specs

\`validate(spec)\` checks schema shape. \`validate(spec, { profile })\` adds
data-aware checks without shipping data. Errors carry stable code, path,
message, and fix. \`{ lint: true }\` also returns advisories for
valid-but-questionable specs.

## Where next

- [Examples](/examples)
- [Interactions](/guide/interactions)
- [Playground](/playground) — local PortableSpec only
- [Compatibility](/guide/compatibility)
- [Errors reference](/guide/errors)
- [JSON Schema](/schema/v0.json)
`;

export const DATA_MAPPINGS_MD = `# Data and mappings

\`aes\` names which field feeds each visual channel. Source rows are not mutated.

## Map fields to position

Numeric fields to position channels:

\`\`\`svelte fragment
aes={{ x: "weight", y: "economy" }}
\`\`\`

Change the mapping without reshaping rows, or change rows without changing the
grammar. The [scatter with color example](/examples/point/scatter-color) adds a
discrete color channel on the same positions.

## Keep data local

Inline rows, named datasets, and PortableSpec data all validate and normalize
before render. The docs playground uses bounded local seeds only — no upload.
On failure it keeps the last render-confirmed chart.
`;

export const LAYERS_MARKS_MD = `# Layers and marks

Layers paint in source order. Add a mark without replacing plot data or
mappings.

## Compose layers

Line first, points on top:

\`\`\`svelte fragment
<GeomLine />
<GeomPoint />
\`\`\`

Layers inherit plot mappings unless a layer supplies its own mapping or data.
[Multi-series line](/examples/line/multi-series) uses the same pattern with a
stable discrete color scale.

## Choose a mark for the question

Points for records, lines for ordered series, columns for precomputed heights,
bars for counts, rules/text for annotation. [Examples](/examples) shows each
mark on real data.
`;

export const STATISTICS_POSITIONS_MD = `# Statistics and positions

Stats derive marks from mapped rows. Positions control how derived marks share
coordinate space.

## Statistical summaries

Fitted trend over points:

\`\`\`svelte fragment
<GeomPoint />
<GeomSmooth method="lm" />
\`\`\`

[Loess example](/examples/smooth/loess-scatter): smoother and confidence ribbon
on source points. Histogram, density, boxplot, and errorbar use the same
derive-then-render path.

## Positions

Stack sums, dodge side-by-side groups, fill normalizes each stack to one, jitter
separates overlaps with a deterministic seed. [Bar examples](/examples?category=bar).
`;

export const SCALES_GUIDES_MD = `# Scales and guides

A scale translates semantic data values into a visual position or color. A
position transform runs before statistics; an axis explains the trained scale
without changing its meaning.

## Continuous position scales

Numeric x and y fields use a continuous linear scale by default. Non-temporal
continuous scales reserve 5% multiplicative display expansion at both ends.
Expansion affects only display training, never filtering or statistics. Restore
flush bounds with \`expand: { mult: 0, add: 0 }\`.

Use the closed \`identity\`, \`log10\`, and \`sqrt\` transforms. The scale family
stays \`linear\`: GuidePlan and RenderModel report \`type/scaleType: "linear"\`
plus the transform. Authored \`type: "log"\` remains an accepted alias and
canonicalizes to \`{ type: "linear", transform: "log10" }\`.

\`\`\`json fragment
{
  "scales": {
    "x": { "type": "linear", "transform": "log10" },
    "y": { "type": "linear", "transform": "sqrt", "reverse": true }
  }
}
\`\`\`

Builder helpers and their ggplot2 aliases produce the same canonical spec:

\`\`\`ts fragment
import {
  scaleXLog10,
  scaleYSqrt,
  scale_x_log10,
} from "@ggsvelte/spec";

const camel = scaleXLog10({ domain: [1, 10_000] });
const alias = scale_x_log10({ limits: [1, 10_000] });
const root = scaleYSqrt({ reverse: true });
\`\`\`

The Svelte surface accepts the same JSON and re-exports the same helpers:

\`\`\`svelte fragment
<GGPlot
  data={rows}
  aes={{ x: "latency", y: "requests" }}
  scales={{
    x: { type: "linear", transform: "log10" },
    y: { type: "linear", transform: "sqrt" },
  }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

The smooth receives transformed x and y. This is intentionally different from
a post-stat coordinate transform: scale transformation can change a fit,
histogram, density estimate, summary, or boxplot.

## Limits, missing values, and OOB policy

\`domain\` and helper \`limits\` pin an unexpanded interval in semantic source
units. Supplying both to a helper is an error. The default \`oob: "censor"\`
replaces out-of-limit values with missing before stats; \`oob: "squish"\`
clamps them to the nearest limit first. \`naValue\` replaces missing/censored
positions before transform-domain validation.

Log10 requires positive values and sqrt requires non-negative values. Recovery
is explicit: filter or repair the data, select identity, widen limits, or choose
the intended OOB policy. See
[scale-transform-domain](/guide/errors#scale-transform-domain),
[scale-oob-censored](/guide/errors#scale-oob-censored), and
[scale-oob-squished](/guide/errors#scale-oob-squished).

## Binned positions

A binned scale assigns quantitative values to bounded transformed-space bins
while preserving source values for tooltips and events:

\`\`\`svelte fragment
scales={{
  x: {
    type: "binned",
    transform: "log10",
    breaks: [1, 10, 100, 1000],
  },
}}
\`\`\`

The runtime keeps integer bin identities private for count/stack/fill/dodge.
Geometry, jitter, guides, and synthesized candidates use transformed centers
and semantic inverse values. Explicit or automatic bins are right-closed with
an inclusive lowest edge and are capped at 64.

## Breaks and labels

\`breaks\` and \`minorBreaks\` are bounded semantic source values. Major breaks
win when a major and minor coincide. Explicit breaks outside the trained domain
are omitted with
[scale-break-outside-domain](/guide/errors#scale-break-outside-domain).
Temporal \`dateMinorBreaks\` outranks generic \`minorBreaks\`.

\`reverse\` changes the pixel direction but not semantic tick order. \`nice\`
controls numeric domain rounding. Guides retain complete semantic values and
apply the forward transform exactly once.

## Categorical color

Use a named categorical scheme when color identifies groups:

\`\`\`svelte fragment
aes={{ x: "weight", y: "economy", color: "vehicleClass" }}
scales={{ color: { type: "ordinal", scheme: "observable10" } }}
\`\`\`

Stable assignments preserve category identity as rows filter or reorder. See
registered schemes and capacities on
[Themes and color](/themes). Palette exhaustion is
\`onExhaust: "cycle"\` (default, warn once) or \`"error"\` — diagnostics at
[palette-exhausted](/guide/errors#palette-exhausted) and
[palette-exhausted — warning](/guide/errors#palette-exhausted-warning).

## Date and time axes

Declare a time scale for ISO 8601 values and let the scale choose UTC calendar
ticks. Time axes preserve temporal parsing and expansion behavior and always
use the identity position transform. Pin breaks or labels only when the
audience needs a fixed convention. The
[time-axis example](/examples/line/time-axis) is the runnable contract.
`;

export const FACETS_COORDINATES_MD = `# Facets and coordinates

Facets partition rows into panels before panel stats. Coordinates present
trained scales (flip, etc.) without rewriting aesthetic mappings.

## Facet a comparison

One grammar, one panel per group:

\`\`\`svelte fragment
facet={{ wrap: "vehicleClass", ncol: 2 }}
\`\`\`

Fixed scales: compare magnitudes across panels. Free scales: within-panel shape
at the cost of cross-panel magnitude. [facet wrap](/examples/facet/wrap),
[free-y](/examples/facet/wrap-free-y).

## Coordinates

Prefer \`coord flip\` for horizontal bars over swapping x/y semantics.
[Horizontal bar](/examples/bar/horizontal) keeps category on x, value on y, then
flips presentation.

## Scale transforms versus coordinate transforms

A scale transform changes the values consumed by statistics and positions. A
coordinate transform leaves those computations alone and projects the final
geometry:

\`\`\`ts fragment
// The linear fit consumes log10(exposure).
gg(rows, aes({ x: "exposure", y: "response" }))
  .geomSmooth({ method: "lm" })
  .scaleXLog10();

// The fit consumes exposure; only its rendered geometry is curved.
gg(rows, aes({ x: "exposure", y: "response" }))
  .geomSmooth({ method: "lm" })
  .coordTransform({ x: "log10" });
\`\`\`

The portable JSON form is strict and callback-free:

\`\`\`json complete
{
  "type": "transform",
  "x": {
    "transform": "log10",
    "limits": [1, 1000],
    "reverse": false,
    "expand": false
  },
  "clip": true
}
\`\`\`

Use \`coordTransform\` or its identical ggplot2-style alias
\`coord_transform\`. In Svelte, pass the result to \`coord\`:

\`\`\`svelte fragment
<GGPlot coord={coordTransform({ x: "log10", y: "sqrt" })}>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
\`\`\`

Coordinate limits create a post-stat viewport: they do not censor rows or
recompute a fit. Coordinate inversion runs before scale inversion, so tooltip,
interval, and brush-zoom values remain semantic. Nonlinear lines, smooths,
areas, smooth confidence bands, and segments use bounded adaptive tessellation;
synthetic render vertices never become inspectable data. Set \`clip: false\`
only for intentional panel overflow.

Non-identity coordinate transforms reject band and temporal axes with
\`coord-transform-continuous\` or \`coord-transform-temporal\`. Domains that
cross log10/sqrt boundaries fail with \`coord-transform-domain\` and exact
recovery guidance. Open the runnable **Post-stat coordinate transform** sample
in the [Playground](/playground).
`;

export const THEMES_COLOR_MD = `# Themes and color

Theme: paper, ink, grid, type, interaction roles. Scales: data color. Site
appearance is independent unless follow mode is explicit.

## Choose a chart theme

Registered theme name; mappings unchanged:

\`\`\`svelte fragment
theme="economist"
\`\`\`

Twelve themes, categorical palettes, sequential ramps:
[Themes and color](/themes). Exhaustion:
[palette-exhausted](/guide/errors#palette-exhausted).

## Preserve color meaning

Explicit range beats named scheme beats edition default. Changing theme must
not reassign categorical colors or reverse a sequential ramp.
`;

export const INSPECT_PIN_MD = `# Inspect and pin

Chart-local: semantic crosshair, HTML tooltip, keyboard traversal, optional pin.

## Inspect and pin

Stable row key + inspect:

\`\`\`svelte fragment
<GGPlot
  key="id"
  inspect={{ mode: "exact", pin: true }}
/>
\`\`\`

Pointer, touch, and keyboard report the same semantic datum. Enter/Space pins;
Escape dismisses. [Inspection example](/examples/interaction/tooltip).

## Keep ownership honest

Tooltip, crosshair, active tool, and pin stay private to one chart. Share a
controller only for selection, emphasis, intervals, or zoom domains that other
UI also needs.
`;

export const SELECTION_ZOOM_MD = `# Selection and zoom

Selection: semantic identities. Zoom: visible domains. Separate tools so
gestures do not fight inspection or page scroll.

## Select points

Stable keys; events carry semantic identities, not renderer indices.

\`\`\`svelte fragment
<GGPlot key="id" select={{ type: "point", multiple: true }} />
\`\`\`

## Select an area and zoom

Interval selection and brush zoom are separate tools with domain bounds, clear
paths, and keyboard-editable bounds.
[Selection and zoom](/examples/interaction/brush-zoom).
`;

export const LINKED_VIEWS_MD = `# Linked views

Share selection, emphasis, intervals, or domains across plots, controls, or
tables via \`createPlotInteraction\`.

## Create a shared controller

\`\`\`svelte fragment
const interaction = createPlotInteraction<string>();
const scope = { keys: "record-id", x: "weight", y: "economy" } as const;
\`\`\`

Same controller + scope on every consumer. Passive plots render without re-emitting.
[Linked views](/examples/interaction/linked-views): two plots, buttons, table.

## Keep local state local

Inspection, tooltip, crosshair, active tool, and interval drafts stay chart-local.
Share committed semantic state, not pixels or UI mode.
`;

export const ACCESSIBILITY_MD = `# Accessibility

Accessible name, keyboard/touch paths, visible focus, live announcements, and
a data-detail alternative when marks are dense.

## Name the chart

\`\`\`svelte fragment
<GGPlot ariaLabel="Fuel economy decreases as vehicle weight increases" />
\`\`\`

Subject or takeaway — not generic image alt, not a substitute for a caption.

## Keyboard and touch

Focus the chart; arrows/brackets traverse. Enter/Space pins or commits the
active tool; Escape dismisses. Touch pins rather than relying on hover.
[Inspection example](/examples/interaction/tooltip): pinned content in labelled DOM.

## Dense charts

Canvas marks keep SVG axes/legends and the accessible description/table path.
Forced colors keeps controls and focus when system colors replace chart paint.
`;

export const RESPONSIVE_CHARTS_MD = `# Responsive charts

Omit width: GGPlot observes its container. Positive-width block, no chart CSS.
Omitted height: 400px default.

## Container width

Collapsed parent, hidden tab, or zero-width track → not-ready until
ResizeObserver reports positive width. Do not paper over that with a fake fixed
width. [Troubleshooting](/guide/errors#quickstart-troubleshooting).

## Server fallback and hydration

SSR: 640×400 deterministic fallback, not-ready in HTML, measure after hydration.
Reserve layout space to avoid CLS.
`;

export const RENDERING_PERFORMANCE_MD = `# Rendering and performance

Renderer follows mark density and interaction needs. Axes, legends, labels, and
a11y chrome stay semantic regardless of SVG vs canvas.

## SVG, canvas, and auto

SVG: DOM marks. Canvas: dense strata. Auto: switches above the published
threshold and emits \`canvas-auto\`. [10k-point scatter](/examples/point/canvas-scatter):
canvas marks, SVG axes/legend.

## Canvas and interaction

Inspection and selection use the model-owned candidate store, not DOM hit tests.
Stable keys keep identity across SVG/canvas; renderer indices never appear in
public callbacks.

## Measure before overriding

Use repo performance fixtures and advisories. Do not pick canvas from screenshot
timing alone, or force global canvas that drops useful SVG detail.
`;

export const SERVER_RENDERING_EXPORT_MD = `# Server rendering and export

Three paths, one PortableSpec: Svelte SSR, pure \`renderToSVGString\`, CLI.

## Server rendering

Same deterministic layout fallback as the responsive component. Measurement and
interaction attach after hydration.

## Pure SVG export

\`\`\`ts fragment
import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 640, height: 400 });
\`\`\`

No DOM. Complete SVG string.

## Command-line export

\`\`\`sh fragment
ggsvelte-render spec.json > chart.svg
\`\`\`

SVG on stdout; JSON Lines diagnostics on stderr. [CLI reference](/reference/cli).
`;

export const TEMPORAL_SCALES_MD = `# Dates without preprocessing

ggsvelte infers strict ISO dates/date-times, four-digit year strings,
year-months, month-years, year-quarters, and runtime \`Date\` values from data.
Classification inspects at most the first and last 32 non-null values; after it
selects one parser family, every non-null value must validate. A partially valid
column never becomes partially temporal.

## Let the default work

\`"1835"\`, \`"1900"\`, and \`"2026"\` are spaced as calendar years, not as
three equally spaced categories. Numeric \`1835\` stays quantitative.

\`\`\`svelte fragment
<script lang="ts">
  import { GGPlot, GeomLine } from "@ggsvelte/svelte";
  const rows = [
    { year: "1835", value: 12 },
    { year: "1900", value: 19 },
    { year: "2026", value: 31 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "year", y: "value" }} width="container" height={360}>
  <GeomLine />
</GGPlot>
\`\`\`

## Inspect the choice

Read \`model.scaleDecisions\` in \`onrender\` for field, parser, precision,
bounded evidence, validated count, trained domain, ambiguity, and a portable
override. Exceptional or advisory choices also appear in
\`model.scaleDiagnostics\` as stable problem/cause/fix records. The responsive
axis decisions live in \`model.guidePlans\`: each drawn panel axis reports its
calendar interval, visible and complete labels, major/minor tier, locale,
timezone, overlap state, and stable ID. \`ScaleDecision.guidePlanIds\` links
inference to those panel plans without copying facet-specific arrays.

## Responsive calendar labels

Automatic temporal axes score calendar-aligned candidates from milliseconds to
centuries against the actual panel extent and measured label widths. They prefer
3–7 major labels, but no-overlap wins. Month, quarter, year, week, and day
stepping follows civil boundaries rather than average milliseconds. The planner
runs inside the existing two layout passes and may move only to a coarser
interval during pass B.

Default date labels keep UTC calendar meaning. Datetime labels use the configured
IANA timezone. The deterministic defaults are \`en-US\`, UTC, and Monday week
starts. Visible labels may suppress repeated context; every SVG major tick keeps
a complete standalone label in its \`<title>\`.

Use exact portable controls when the default is not the editorial choice:

\`\`\`ts fragment
const spec = gg(rows, aes({ x: "when", y: "value" }))
  .geomLine()
  .scaleXDatetime({
    dateBreaks: "2 weeks",
    dateMinorBreaks: "1 day",
    dateLabels: "%e %b",
    locale: "en-GB",
    timezone: "Europe/London",
    weekStart: "monday",
  })
  .spec();
\`\`\`

Canonical JSON uses the same fields. Interval strings are a positive integer plus
\`millisecond\`, \`second\`, \`minute\`, \`hour\`, \`day\`, \`week\`, \`month\`,
\`quarter\`, or \`year\` (singular or plural). Explicit \`breaks\` outrank
\`dateBreaks\`; \`dateLabels\` outranks the older soft-fallback \`labels\` field.
Authored breaks and labels are never silently thinned, rotated, or truncated.
If they cannot fit, the render keeps them and emits a structured scale
diagnostic with a coarser-interval or wider-layout fix.

## Override one choice

Ambiguous values such as \`03/04/2024\` stay discrete. Pick the intended order:

\`\`\`ts fragment
const spec = gg(rows, aes({ x: "when", y: "value" }))
  .geomLine()
  .scaleXDate({ parse: "dmy" })
  .spec();
\`\`\`

Canonical JSON uses \`scales: { x: { type: "time", parse: "dmy" } }\`.
The closed parser names are generated from the runtime registry:
\`${TEMPORAL_PARSER_NAMES.join("`, `")}\`. Exact bounded formats and epoch
seconds/milliseconds are object parser forms. Timezone-less values mean UTC;
IANA zones use Temporal with explicit DST disambiguation.

If four-digit strings are identifiers, force categories with
\`.scaleXDiscrete()\`, \`scale_x_discrete()\`, or
\`scales: { x: { type: "band" } }\`.

## PortableSpec boundary

PortableSpec remains strict JSON: no \`Date\`, callback, or regular expression.
The checked capability ledger records the temporal family as
\`${SCALE_CAPABILITIES.find((capability) => capability.family === "position-temporal")?.runtime ?? "missing"}\`; docs, helper tests, and agent checks consume that ledger.
Builder and Svelte authoring may contain runtime Dates; they canonicalize to ISO
before validation. The standalone \`ymd\`, \`mdy\`, \`dmy\`, related order and
timestamp helpers, exact-format parser, and epoch helpers return authoring Dates.
`;

export const COMPATIBILITY_MD = `# Compatibility

ggsvelte is tested from release-shaped packed tarballs, never only through
workspace imports. “Supported” means a clean install, strict
type-check, client production build, server render, pure Node render, and
installed \`ggsvelte-render\` CLI execution all pass.

## Supported consumers

- Node.js ${supportMatrix.node.tested.join(" and ")} are required release checks; Node.js ${supportMatrix.node.canary} is a nightly canary. Published packages declare \`${supportMatrix.node.range}\`.
- Svelte ${supportMatrix.svelte.minimum} is the exact tested floor and ${supportMatrix.svelte.current} is the pinned current release. The peer range is \`${supportMatrix.svelte.range}\`.
- Installers: npm ${supportMatrix.packageManagers.npm}, pnpm ${supportMatrix.packageManagers.pnpm}, and Bun ${supportMatrix.packageManagers.bun}.
- Browsers: Chromium, Firefox, and WebKit from pinned Playwright ${supportMatrix.browsers.playwright}.
- Ubuntu and Windows are required CI platforms; macOS is exercised nightly.

The required matrix is deliberately a small covering set. A scheduled matrix
adds Node Current, macOS, and more Windows/package-manager boundary pairs
without making every pull request pay for a full Cartesian product. Exact,
machine-checked rows live in [support-matrix.json](https://github.com/ljodea/ggsvelte/blob/main/support-matrix.json).

The root \`bun@${supportMatrix.packageManagers.bun}\` pin is the contributor
toolchain. Consumers may use any tested installer above; they do not need Bun.
`;

export const INTERACTIONS_MD = `# Interactions

Static by default. Opt in with \`inspect\`, \`select\`, \`zoom\`, \`legendFocus\`,
\`legendFilter\`. With more than one draw tool, an accessible tool rail keeps
gestures from competing.

Without a controller, state is private to one chart and callbacks report
changes. Pass \`createPlotInteraction()\` when plots, controls, or tables share
semantic state (required, stable semantic scope via \`interactionScope\`).

Examples: [inspect](/examples/interactions/inspection),
[interval/zoom](/examples/interactions/interval-selection),
[linked views](/examples/interaction/linked-views),
[legend focus](/examples/interaction/legend-focus),
[legend filter](/examples/interaction/legend-filter),
[facet intervals](/examples/interaction/facet-intervals),
[playground](/playground).
Contracts: [interaction reference](/guide/interaction-reference).

## Inspection

\`inspect={true}\` enables the default HTML tooltip, semantic crosshair,
keyboard traversal, and click-or-Enter pinning. Configure it when the chart
has a natural comparison axis:

\`\`\`svelte fragment
<GGPlot
  {data}
  aes={{ x: "date", y: "value", color: "series" }}
  key="id"
  inspect={{ mode: "x", pin: true, maxDistance: 24 }}
  oninspect={(event) => console.log(event)}
>
  <GeomLine />
  <GeomPoint />
</GGPlot>
\`\`\`

The modes are \`auto\`, \`exact\`, \`x\`, \`y\`, and \`xy\`. \`auto\` resolves to a
concrete mode before an event is emitted. \`x\` and \`y\` return one
representative per semantic series at the focused axis value; \`exact\` and
\`xy\` return the focused datum. \`maxDistance\` is measured in CSS pixels: the
dominant axis for \`x\` or \`y\`, Euclidean distance for \`xy\`, and geometry
containment plus tolerance for \`exact\`.

For custom HTML, pass a Svelte 5 snippet. Informational content is the default;
choose \`contentMode: "interactive"\` only when the pinned tooltip contains
controls that need focus.

\`\`\`svelte fragment
{#snippet details(inspection)}
  <strong>{inspection.focus.row?.name}</strong>
  <span>{inspection.members.length} series at this value</span>
{/snippet}

<GGPlot inspect={{ mode: "x", content: details }} />
\`\`\`

## Point and interval selection

Point selection is durable identity, not a renderer index. Supply a unique,
stable string, number, or symbol for every source row:

\`\`\`svelte fragment
<GGPlot
  key="id"
  select={{ type: "point", multiple: true }}
  onselect={(event) => {
    if (event.mode === "point") selectedKeys = event.keys;
  }}
/>
\`\`\`

Use interval selection for brushing. The callback receives both the selected
domain and normalized plot-pixel rectangle, plus semantic keys and a lineage
count for aggregate marks.

\`\`\`svelte fragment
<GGPlot
  key="id"
  select={{ type: "interval", mode: "xy", persistent: true }}
  onselect={(event) => {
    if (event.mode !== "point" && event.phase === "end") {
      selectedDomain = event.domain;
    }
  }}
/>
\`\`\`

Faceted intervals use stable field-and-value panel identities rather than panel
indices. Choose a preset for the relationship between panels:

- \`independent\` (default) replaces the interval in only the origin panel.
- \`union\` keeps independently drawn panel intervals and combines their keys.
- \`cross-panel\` projects one semantic domain through every compatible panel.

\`cross-panel\` intersects the interval with each panel's domain when facet
scales are free; a disjoint panel selects nothing instead of clamping to an
unrelated edge. Panel identity survives row reordering and temporary absence.
See the [runnable facet example](/examples/interaction/facet-intervals).

## Shared controlled state

\`createPlotInteraction<Key>()\` owns selection, emphasis, and continuous zoom
domains outside any chart. Give linked consumers the same controller and a
required, stable semantic scope via \`interactionScope\`. A transition is
published once by its origin; passive charts render the new snapshot without
emitting the callback again. Controlled plots never infer channel names: add an
\`x\` and/or \`y\` scope whenever controlled zoom uses that channel.

\`\`\`svelte fragment
<script lang="ts">
  import { createPlotInteraction } from "@ggsvelte/svelte";

  const interaction = createPlotInteraction<string>();
  const scope = { keys: "penguin-id", x: "flipper-mm", y: "mass-g" } as const;
  const selected = $derived(interaction.selected(scope));
</script>

<GGPlot
  {data}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
/>
<GGPlot
  {data}
  key="id"
  select={{ type: "point", multiple: true }}
  {interaction}
  interactionScope={scope}
/>
<button onclick={() => interaction.setSelection(["gentoo-1"], { scope })}>
  Select Gentoo 1
</button>
\`\`\`

Use \`setSelection\`, \`toggleSelection\`, and \`clearSelection\` for durable
keys. \`setEmphasis\` is presentation-only: linked charts update their highlight
overlay without retraining scales or rerunning the render pipeline. Matching
\`x\` and \`y\` scope names share numeric zoom domains. When application data is
replaced, call \`reconcileKeys(validKeys, { scope })\` explicitly; a chart never
guesses whether a temporary subset should erase another view's selection.

Durable facet intervals use their own optional \`interactionScope.intervals\`
namespace (falling back to \`keys\`). Read them with \`intervals(scope)\`, write
one with \`setInterval\`, clear one panel with \`clearInterval\`, or clear the
scope with \`clearIntervals\`. Interval state is semantic data-space state, not
pixels or renderer indices.

## Legend focus

\`legendFocus={true}\` adds real HTML controls over discrete color and fill
legends. Hover and DOM focus preview one chart without mutating shared state.
Click, touch, Enter, or Space commits the matching stable row keys; the active
entry or Escape clears them. Arrow keys traverse entries in rendered legend
order, with Home and End moving to the boundaries.

\`legendFocus={{ preview: false }}\` keeps committed activation but disables
transient previews. Continuous ramps remain static. A stable \`key\` is required:
encoded legend values are reported as values, never used as controller keys.
Focused and muted marks share one semantic mask across SVG and canvas, and the
mask does not retrain scales, recompute statistics, change layout, or reassign
colors. See the [runnable three-view example](/examples/interaction/legend-focus).

## Legend filtering

\`legendFocus\` is presentation emphasis only — it does not change data.
\`legendFilter={true}\` adds Show-group checkboxes on discrete color/fill
legends and filters rows before facets, stats, scales, layout, and render.
Hidden groups stay in the legend catalog and keep the same categorical color
when shown again.

Use \`legendFilter={{ mode: "exclude", multiple: true }}\` for the default
independent checkboxes. \`mode: "include"\` stores the shown values instead;
\`multiple: false\` makes a toggle isolate one group. \`onlegendfilter\` reports
the raw typed values and field in a \`LegendFilterClause\`. Reset legend filters
restores the data pipeline; Clear legend focus only removes presentation
emphasis. See the [stable-color example](/examples/interaction/legend-filter).

## Brush zoom

\`zoom={true}\` enables two-dimensional brush zoom. Set \`zoom={{ mode: "x" }}\`
or \`zoom={{ mode: "y" }}\` for a single axis. The tool rail separates Zoom area
from Select area when both are enabled. A completed zoom emits explicit
domains; Reset zoom or double-click emits a clear event.
Faceted interval selection is supported, but faceted brush zoom remains
disabled with \`INTERACTION_INTERVAL_FACET_UNSUPPORTED\`; use a linked detail
view when each facet needs a zoomed inspection surface.

\`\`\`svelte fragment
<GGPlot
  zoom={{ mode: "xy" }}
  onzoom={(event) => console.log(event.domains)}
/>
\`\`\`

## Precise bounds without dragging

After an interval selection or zoom is committed, the tool rail exposes Edit x
or y bounds alongside its drag controls. The inline HTML form stages edits:
typing does not rerun the chart, Apply commits once, Cancel or Escape discards
the draft, and validation focuses the first invalid field. This provides a
keyboard and assistive-technology path to the same semantic result as brushing.

- Linear and reversed scales accept ascending data-space numbers. Reversal is
  presentation only, so do not enter screen order.
- Log scales accept positive ascending numbers.
- Time scales accept ISO 8601 dates or date-times with \`Z\` or an explicit
  offset; events store Unix milliseconds.
- Band scales use two native selects and include both endpoint categories.

Recovery actions are deliberately separate: Clear panel selection removes one
facet interval, Clear all selections removes interval state, Reset zoom restores
natural domains, and Reset legend filters restores excluded rows. None of these
controls silently performs another reset.

## Event reference

All events carry \`type\`, \`phase\`, and \`source\` (\`pointer\`, \`keyboard\`,
\`touch\`, or \`programmatic\`). Use the focused callback for one capability or
\`oninteraction\` for the discriminated union of every event.

### \`oninspect(event: PlotInspection)\`

- A change is \`{ type: "inspect", phase: "change", state, source, mode,
  panelId, focus, members }\`.
- \`state\` is \`transient\` or \`pinned\`; \`members\` is always non-empty and
  \`focus\` is the member under direct inspection.
- \`x\` and \`y\` changes also carry the original logical \`axisValue\` and its
  formatted \`axisLabel\`.
- Dismissal is the small event \`{ type: "inspect", phase: "clear", source }\`.

Each \`PlotDatum\` has \`key\`, source \`row\` when one exists, aggregate
\`sourceKeys\` and \`lineageCount\`, \`layerIndex\`, \`panelId\`, mapped \`fields\`,
and a plot-pixel \`anchor\`. Keyless or synthetic marks expose \`key: null\`;
internal renderer indices never leak into callbacks.

### \`onselect(event: PlotSelection)\`

- Point selection emits \`{ type: "select", phase: "end" | "clear",
  mode: "point", keys, source }\`.
- Interval selection emits \`start\`, \`change\`, \`end\`, and \`clear\` phases with
  \`mode\`, \`panelId\`, \`domain\`, \`pixels\`, \`keys\`, \`lineageCount\`, and
  \`source\`.

### \`onzoom(event: ZoomEvent)\`

- Zoom completion is \`{ type: "zoom", phase: "end", source, domains }\`.
- Reset is \`{ type: "zoom", phase: "clear", source, domains: null }\`.

### \`onlegendfocus(event: LegendFocusEvent)\`

- Preview and commit emit \`{ type: "legend-focus", phase: "change", state,
  source, scale, value, label, keys }\`.
- \`state\` is \`transient\` or \`committed\`. \`value\` is the raw encoded
  domain value while \`keys\` are distinct stable source-row identities.
- Dismissal emits \`{ type: "legend-focus", phase: "clear", source }\`.

### \`onlegendfilter(event: LegendFilterEvent)\`

- A change emits \`{ type: "legend-filter", phase: "change", source, clause }\`.
- \`clause\` names the color or fill scale, source field, typed values, and
  include or exclude mode. Reset emits \`phase: "clear"\` and \`clause: null\`.
- Filtering is data-changing and intentionally separate from the
  presentation-only \`onlegendfocus\` event.

\`oninteraction(event: PlotInteractionEvent)\` receives the same objects. It
does not wrap or duplicate them. A linked chart that consumes shared state
should not re-emit the origin chart's event.

## Keyboard and accessibility defaults

Focus the plot, then use arrow keys or brackets to traverse data. Enter or
Space pins inspection, activates point selection, or sets the two corners of
an area, depending on the active tool. Escape dismisses the current
interaction. Keyboard inspection updates a polite live region with a concise
axis, count, and pin summary; complete pinned content remains ordinary labelled
and navigable DOM.

## Identity and diagnostics

Use \`key="id"\` when the row has a field, or \`key={(row) => row.id}\` for an
accessor. Keys must be non-null unique \`PropertyKey\` values and stable across
updates. Invalid or duplicate keys emit structured diagnostics through
\`ondiagnostic\`; they never silently fall back to array positions. Stable keys
let pinned inspection and point selection follow a datum when data is updated.
`;

const interactionDiagnostics = Object.values(INTERACTION_DIAGNOSTIC_CATALOG)
  .map(
    (entry) => `### \`${entry.code}\`

${entry.message}

- Prop: \`${entry.prop}\`
- Severity: \`${entry.severity}\`
- Try: ${entry.suggestions.join("; ")}
- More: [${entry.docUrl}](${entry.docUrl})`,
  )
  .join("\n\n");

export const INTERACTION_REFERENCE_MD = `# Interaction reference

Searchable interaction contract. Chart-local state and callbacks by default.
\`createPlotInteraction()\` for shared semantic state across plots and UI.

## Static default

No capture layer, tooltip, selection, or zoom until a capability is enabled.
Page scroll is not hijacked by unused tools.

## Capability props

### \`inspect\`

Enables inspection, the default HTML tooltip, semantic crosshair, keyboard
traversal, and optional pinning. Inputs are \`true\` or options with \`mode\`,
\`pin\`, \`maxDistance\`, \`content\`, and \`contentMode\`.

### Point selection

\`select={{ type: "point", multiple: true }}\` stores stable semantic keys.
Supply \`key\` for every row.

### Interval selection

\`select={{ type: "interval", mode: "x" | "y" | "xy", persistent: true }}\`
enables an explicit Select area tool and emits domain and pixel bounds. In
facets, add \`preset: "independent" | "union" | "cross-panel"\` to replace one
panel, combine panel selections, or project one domain through compatible
panels.

### \`zoom\`

\`zoom={{ mode: "x" | "y" | "xy" }}\` enables the explicit Zoom area tool.
Reset zoom and double-click return to the natural domains.

### \`legendFocus\`

\`legendFocus={true}\` enables discrete legend preview and committed focus.
Use \`legendFocus={{ preview: false }}\` to disable hover/focus preview while
retaining click, touch, Enter, Space, Escape, and arrow-key controls. It
requires stable row \`key\` values and does not make continuous ramps interactive.

### \`legendFilter\`

\`legendFilter={true}\` adds native Show-group checkboxes to discrete color and
fill legends. It changes the rows supplied to facets, statistics, scales, and
rendering while preserving the full legend catalog and categorical color
identity. Configure \`mode: "exclude" | "include"\` and \`multiple\`; receive
typed clauses through \`onlegendfilter\`. It is independent of
presentation-only \`legendFocus\`.

## Controlled tool

\`tool\` and \`ontoolchange\` control the active Inspect, Select area, or Zoom
area mode. Keep the value in Svelte state when application controls and the
plot tool rail must stay synchronized:

\`\`\`svelte fragment
<script lang="ts">
  import type { InteractionTool } from "@ggsvelte/svelte";

  let activeTool = $state<InteractionTool>("inspect");
</script>

<GGPlot
  inspect={true}
  select={{ type: "interval" }}
  tool={activeTool}
  ontoolchange={(next) => (activeTool = next)}
/>
\`\`\`

A controlled unavailable tool requests a change and emits a diagnostic; it
does not silently arm a different drag behavior. The active tool remains local
to one chart; shared controllers coordinate data semantics, not UI modes.

## Shared controller

\`createPlotInteraction<Key>({ onchange? })\` returns a reactive
\`PlotInteractionController<Key>\`. Pass it through the \`interaction\` prop and
name the semantic channels with the required
\`interactionScope={{ keys, x?, y? }}\`; controlled plots never fall back to a
generic scope or infer x/y channel names from encodings. Controlled zoom
requires an explicit scope for every active channel (x, y, or both).

- Reads: \`selected(scope)\`, \`emphasized(scope)\`, \`intervals(scope)\`,
  \`isSelected(key, scope)\`, \`zoom(scope)\`, \`snapshot\`, and \`revision\`.
- Selection: \`setSelection\`, \`toggleSelection\`, and \`clearSelection\`.
- Lightweight presentation: \`setEmphasis\` and \`clearEmphasis\`.
- Facet intervals: \`setInterval\`, \`clearInterval\`, and \`clearIntervals\`.
- Domains: \`setZoom\` and \`resetZoom\` for finite numeric x/y pairs.
- Data replacement: \`reconcileKeys(validKeys, { scope })\` explicitly removes
  selected or emphasized keys that no longer exist.

Scopes are application-level names. Reuse a key scope only where keys mean the
same thing, and reuse x/y scopes only where their data domains are compatible.
Every mutation returns one immutable transition or \`null\` for a no-op. Passive
consumers never republish controller state, preventing linked-view feedback
loops. Do not mutate the controller inside its synchronous \`onchange\`
callback; schedule a later Svelte application update instead. See the
[linked views example](/examples/interaction/linked-views).

## Identity

\`key\` is a field name or accessor returning a unique stable \`PropertyKey\`. Public
events expose semantic keys, aggregate \`sourceKeys\`, and \`lineageCount\`,
never renderer indices.

## Events

### \`oninspect\`

Receives \`PlotInspection\`: \`change\` with transient or pinned focus and
members, or \`clear\`.

### \`onselect\`

Receives \`PlotSelection\`. Point selection emits \`end\` and \`clear\`.
Interval selection emits \`start\`, \`change\`, \`end\`, and \`clear\`.

### \`onzoom\`

Receives \`ZoomEvent\`: \`end\` with explicit domains or \`clear\` with null
domains.

### \`onlegendfocus\`

Receives \`LegendFocusEvent\`: a transient or committed \`change\` carrying the
raw encoded value, formatted label, scale channel, and stable row keys, or a
small \`clear\` event. The same object is included in \`oninteraction\`.

### \`onlegendfilter\`

Receives \`LegendFilterEvent\`: a \`change\` with one typed
\`LegendFilterClause\`, or \`clear\` with \`clause: null\`. Legend filtering
changes pipeline input and is not folded into the presentation interaction
union.

### \`oninteraction\`

Receives the same discriminated \`PlotInteractionEvent\` union emitted by the
focused callbacks. Narrow on \`type\` and \`phase\`.

### \`ondiagnostic\`

Receives structured \`InteractionDiagnostic\` objects with \`severity\`,
\`code\`, \`message\`, \`prop\`, \`suggestions\`, and \`docUrl\`.

\`\`\`svelte fragment
<GGPlot
  ondiagnostic={(diagnostic) =>
    console.warn(diagnostic.code, diagnostic.message, diagnostic.suggestions)}
/>
\`\`\`

Every event has a \`source\`: \`pointer\`, \`keyboard\`, \`touch\`, or
\`programmatic\`.

## Diagnostics

${interactionDiagnostics}

## Accessibility

The plot surface is named and keyboard focusable when interaction is enabled.
Arrow keys or brackets traverse data; Enter or Space pins or commits the active
tool; Escape dismisses. A polite live region announces concise state while
pinned HTML remains labelled, navigable DOM. Area tools remain explicit so
ordinary page scrolling is available until a user chooses a drag mode.

Committed interval and zoom state exposes precise Edit-bounds buttons in the
tool rail. Their inline form uses labelled native inputs, stages drafts until
Apply, validates log/time/category constraints, restores trigger focus after
Apply or Cancel, and supports Escape. Linear and reversed domains use ascending
data values; time uses ISO 8601 text; band intervals use inclusive native
selects. Clear panel selection, Clear all selections, Reset zoom, and Reset
legend filters remain separate operations.
`;

export interface InteractionReferenceEntry {
  id: string;
  name: string;
  summary: string;
  href: string;
  keywords: readonly string[];
}

/** Search data for the human-facing reference page, kept beside its prose. */
export const INTERACTION_REFERENCE_INDEX: readonly InteractionReferenceEntry[] = [
  {
    id: "static-default",
    name: "Static by default",
    summary: "No capture layer or gesture until a capability is enabled.",
    href: "/guide/interaction-reference#static-default",
    keywords: ["opt in", "capture", "scroll"],
  },
  {
    id: "inspect",
    name: "Inspect and pin",
    summary: "HTML tooltip, semantic crosshair, pointer and keyboard traversal.",
    href: "/guide/interaction-reference#inspect",
    keywords: ["tooltip", "crosshair", "pin", "keyboard"],
  },
  {
    id: "point-selection",
    name: "Point selection",
    summary: "Select records by stable semantic keys, not renderer indices.",
    href: "/guide/interaction-reference#point-selection",
    keywords: ["select", "multiple", "keys"],
  },
  {
    id: "interval-selection",
    name: "Interval selection",
    summary: "Brush a rectangle; receive domain, pixels, and semantic keys.",
    href: "/guide/interaction-reference#interval-selection",
    keywords: ["brush", "rectangle", "domain", "facet", "union", "cross-panel"],
  },
  {
    id: "zoom",
    name: "Brush zoom",
    summary: "Zoom x, y, or both with an explicit area tool and reset path.",
    href: "/guide/interaction-reference#zoom",
    keywords: ["domain", "reset", "double click"],
  },
  {
    id: "legend-focus",
    name: "Legend focus",
    summary: "Preview or commit discrete legend groups across SVG and canvas.",
    href: "/guide/interaction-reference#legendfocus",
    keywords: ["legendFocus", "onlegendfocus", "emphasis", "keyboard", "touch"],
  },
  {
    id: "legend-filter",
    name: "Legend filtering",
    summary: "Include or exclude groups before stats/scales; color identity stable.",
    href: "/guide/interaction-reference#legendfilter",
    keywords: ["legendFilter", "onlegendfilter", "filter", "checkbox", "stable color"],
  },
  {
    id: "controlled-tool",
    name: "Controlled tool",
    summary: "Bind active Inspect / Select area / Zoom area to Svelte state.",
    href: "/guide/interaction-reference#controlled-tool",
    keywords: ["tool", "ontoolchange", "state"],
  },
  {
    id: "shared-controller",
    name: "Shared controller",
    summary: "Scoped selection, emphasis, and domains across plots and UI.",
    href: "/guide/interaction-reference#shared-controller",
    keywords: ["createPlotInteraction", "linked views", "scope", "reconcileKeys"],
  },
  {
    id: "identity",
    name: "Stable identity",
    summary: "Unique application keys for inspection and selection across updates.",
    href: "/guide/interaction-reference#identity",
    keywords: ["key", "lineage", "sourceKeys"],
  },
  {
    id: "events",
    name: "Typed events",
    summary: "Focused callbacks or PlotInteractionEvent with explicit phases.",
    href: "/guide/interaction-reference#events",
    keywords: ["oninspect", "onselect", "onzoom", "oninteraction", "phase"],
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    summary: "Structured codes, props, suggestions, and doc URLs.",
    href: "/guide/interaction-reference#diagnostics",
    keywords: ["ondiagnostic", "warning", "error", "suggestions"],
  },
  {
    id: "accessibility",
    name: "Accessibility",
    summary: "Keyboard traversal, bounds form, live region, labelled DOM, explicit tools.",
    href: "/guide/interaction-reference#accessibility",
    keywords: ["screen reader", "keyboard", "live region", "focus", "bounds", "ISO 8601"],
  },
];

export const MIGRATING_PRE_0_1_MD = `# Migrating pre-0.1 interactions

Pre-0.1 props named presentation; current props name intent. Update props,
callback payloads, and custom tooltip snippets together — no runtime shim.

## Rename the props and callbacks

- \`tooltip\` → \`inspect\`
- \`brush\` → \`select={{ type: "interval" }}\`
- \`onhover\` → \`oninspect\`
- \`onbrush\` → \`onselect\`
- \`onzoom={(domains) => ...}\` → \`onzoom={(event) => ...}\`

Before:

\`\`\`svelte fragment
<GGPlot
  tooltip={true}
  brush={true}
  zoom={true}
  onhover={(hit) => (hovered = hit)}
  onbrush={(selection) => (brushed = selection)}
  onzoom={(domains) => (zoomed = domains)}
/>
\`\`\`

After:

\`\`\`svelte fragment
<GGPlot
  key="id"
  inspect={true}
  select={{ type: "interval" }}
  zoom={true}
  oninspect={(event) => (inspection = event)}
  onselect={(event) => (selection = event)}
  onzoom={(event) => (zoomed = event.domains)}
/>
\`\`\`

## Migrate payload handling

\`oninspect\` is a lifecycle. Narrow on \`event.phase === "change"\` before
reading \`focus\`, \`members\`, or \`mode\`; a clear event deliberately carries
only its type, phase, and source. Use \`event.focus.row\` instead of resolving a
renderer hit index yourself.

\`onselect\` also has phases. Interval callbacks receive domain and pixel
bounds on \`event.domain\` and \`event.pixels\`, and return stable semantic
\`event.keys\` instead of source-row indices and renderer hits. Point selection
uses the same callback with \`event.mode === "point"\`.

\`onzoom\` now reports an event. Read \`event.domains\` after an \`end\` phase;
the \`clear\` phase carries \`domains: null\`.

## Migrate custom tooltip snippets

The snippet argument changed from one renderer hit to a semantic inspection:

- \`TooltipContext\` → \`PlotInspectionChange\`
- \`context.row\` → \`inspection.focus.row\`
- \`context.fields\` → \`inspection.focus.fields\`
- \`BrushSelection\` → \`IntervalSelection\`
- \`ZoomDomains\` → \`ReadonlyZoomDomains\`

The old type names remain deprecated aliases where a safe alias is possible,
but the old component props and old callback shapes are removed. Pre-0.1 means
there is no runtime compatibility shim: TypeScript errors should point directly
at every source change you need to make.

See [Interactions](/guide/interactions) for current options, event shapes,
keyboard behavior, and identity requirements.
`;

export const UPGRADING_MD = `# Upgrade in five minutes

One section per released 0.x transition, newest first. Each heading is a
stable anchor that changesets and release notes link to. Pre-1.0, breaking
changes ride minor releases; every deprecation or removal ships with a
migration note here. The pre-release API has its own page:
[Migrating pre-0.1 interactions](/guide/migrating-pre-0-1).

## Five-minute path

- Check that linked \`@ggsvelte/svelte\`, core, and spec packages resolve to one compatible release.
- Read only the adjacent transition sections needed for the installed version.
- Apply the before/after source change backed by the migration fixtures.
- Run strict type, build, render, and visual checks before deploying.
- Follow a stable diagnostic anchor if blocked; roll package versions back together if needed.

The accepted lifecycle and deprecation policy remains in
[Lifecycle and editions](/guide/lifecycle#lifecycle-tags); this page applies it
rather than creating a second policy.

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

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={{ x: { type: "log", domain: [1, 1000] } }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
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
    scaleXLog10,
  } from "@ggsvelte/svelte";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={scaleXLog10({
    domain: [1, 1000],
    oob: "censor",
    expand: { mult: 0, add: 0 },
    nice: false,
  })}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
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
  import { GeomPoint, GGPlot, type RenderModel } from "@ggsvelte/svelte";

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
  inspect
  onrender={(next) => (model = next)}
>
  <GeomPoint />
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

The payload changes behind these renames are documented in
[Migrating pre-0.1 interactions](/guide/migrating-pre-0-1#migrate-custom-tooltip-snippets).
`;
