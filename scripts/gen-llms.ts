/**
 * gen-llms — ONE source for the docs guide prose and the agent-facing
 * `llms.txt` / `llms-full.txt` endpoints (plan: prerendered from the
 * manifest, zero manual upkeep; "one source, three uses").
 *
 * - Guide sections are markdown BUILT FROM THE CATALOGS exported by
 *   @ggsvelte/spec (ERROR_CATALOG, LINT_CATALOG) and @ggsvelte/core
 *   (PIPELINE_*_CATALOG, ADVISORY_CATALOG, CLI_DIAGNOSTIC_CATALOG) plus the
 *   generated lifecycle.json — the docs guide pages render the same markdown
 *   through `renderMarkdown`, so docs and llms surfaces cannot drift.
 * - `buildLlmsIndex` (llms.txt) is the curated index; `buildLlmsFull`
 *   (llms-full.txt) appends every example (title, description, canonical
 *   spec JSON, Svelte source) from the examples manifest.
 *
 * Everything here is pure (data in, string out) and unit-tested in
 * scripts/gen-llms.test.ts; apps/docs imports it via the `$scripts` alias
 * for its prerendered endpoints and guide pages.
 */
import { ADVISORY_CATALOG } from "@ggsvelte/core";
import { LINT_CATALOG, SCALE_CAPABILITIES, TEMPORAL_PARSER_NAMES } from "@ggsvelte/spec";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../packages/svelte/src/lib/interaction/interaction";
import { GUIDE_CATALOG, type GuideSlug } from "../apps/docs/src/lib/catalog/guide";
import supportMatrix from "../support-matrix.json";
import {
  buildDiagnosticDocs,
  type DiagnosticDocEntry,
  type DiagnosticDocSource,
} from "./diagnostic-docs";
import { assertGuideCodeContract, type CodeClassification } from "./guide-code-contract";
import {
  QUICKSTART_BUILDER_FRAGMENT,
  QUICKSTART_CLI_FRAGMENT,
  QUICKSTART_HEADLESS_FRAGMENT,
  QUICKSTART_PAGE_FILENAME,
  QUICKSTART_PAGE_SVELTE,
  QUICKSTART_PORTABLE_SPEC_FRAGMENT,
  quickstartLessonMarkdown,
} from "./quickstart";

export { buildDiagnosticDocs } from "./diagnostic-docs";

// ---------------------------------------------------------------------------
// Minimal markdown renderer (headings, paragraphs, fenced code, inline code,
// links, unordered lists) — enough for the guide sections below, nothing more.
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(s: string, base: string): string {
  let out = escapeHtml(s);
  out = out.replaceAll(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
  out = out.replaceAll(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, text: string, href: string) =>
      `<a href="${href.startsWith("/") ? `${base}${href}` : href}">${text}</a>`,
  );
  out = out.replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

function createHeadingId(): (text: string) => string {
  const headingCounts = new Map<string, number>();
  return (text: string): string => {
    const stem =
      text
        .replaceAll(/`([^`]+)`/g, "$1")
        .toLowerCase()
        .normalize("NFKD")
        .replaceAll(/[\u0300-\u036F]/g, "")
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, "") || "section";
    const count = (headingCounts.get(stem) ?? 0) + 1;
    headingCounts.set(stem, count);
    return count === 1 ? stem : `${stem}-${String(count)}`;
  };
}

export interface MarkdownHeading {
  level: number;
  id: string;
  title: string;
}

/** Extract the exact heading ids used by renderMarkdown for page navigation. */
export function extractMarkdownHeadings(md: string): MarkdownHeading[] {
  const headingId = createHeadingId();
  const headings: MarkdownHeading[] = [];
  for (const line of md.split("\n")) {
    const heading = /^(#{1,4}) (.*)$/.exec(line);
    if (heading === null) continue;
    const rawTitle = heading[2]!;
    headings.push({
      level: heading[1]!.length,
      id: headingId(rawTitle),
      title: rawTitle
        .replaceAll(/`([^`]+)`/g, "$1")
        .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replaceAll("**", ""),
    });
  }
  return headings;
}

/** Render the markdown subset used by the guide sections to HTML. */
export function renderMarkdown(md: string, base = ""): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  let code: string[] | null = null;
  let codeLang = "";
  let codeCopy = false;
  let codeClassification: CodeClassification = "fragment";
  let copyCodeCount = 0;
  const headingId = createHeadingId();

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${inline(paragraph.join(" "), base)}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list !== null) {
      html.push(`<ul>${list.map((li) => `<li>${inline(li, base)}</li>`).join("")}</ul>`);
      list = null;
    }
  };
  const renderCode = (source: string): string => {
    const languageClass = codeLang === "" ? "" : ` class="language-${codeLang}"`;
    const classificationLabel =
      codeClassification === "fragment"
        ? "Fragment"
        : codeLang === "svelte"
          ? "Complete file"
          : codeLang === "sh"
            ? "Complete command"
            : "Complete example";
    const label = `<p class="guide-code-classification">${classificationLabel}</p>`;
    const rendered = `${label}<pre><code${languageClass}>${escapeHtml(source)}</code></pre>`;
    if (!codeCopy) return rendered;
    const id = `guide-code-${String(++copyCodeCount)}`;
    return `${label}<div class="guide-code-copy"><button type="button" data-copy-code="${id}" aria-describedby="${id}-status">Copy code</button><pre id="${id}"><code${languageClass}>${escapeHtml(source)}</code></pre><span id="${id}-status" role="status"></span></div>`;
  };

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith("```")) {
        html.push(renderCode(code.join("\n")));
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      const [language = "", ...flags] = line.slice(3).trim().split(/\s+/);
      codeLang = /^[a-z0-9-]*$/i.test(language) ? language : "";
      codeCopy = flags.includes("copy");
      codeClassification = flags.includes("complete") ? "complete" : "fragment";
      code = [];
      continue;
    }
    const heading = /^(#{1,4}) (.*)$/.exec(line);
    if (heading !== null) {
      flushParagraph();
      flushList();
      const level = heading[1]!.length;
      html.push(
        `<h${level} id="${headingId(heading[2]!)}">${inline(heading[2]!, base)}</h${level}>`,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list ??= [];
      list.push(line.slice(2));
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }
    if (list !== null && line.startsWith("  ")) {
      list[list.length - 1] += " " + line.trim();
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  if (code !== null) html.push(renderCode(code.join("\n")));
  return html.join("\n");
}

// ---------------------------------------------------------------------------
// Guide sections (markdown; single source for docs pages AND llms surfaces)
// ---------------------------------------------------------------------------

export const GETTING_STARTED_MD = `# Getting started

Build a responsive, accessible chart in one Svelte file. Start with the
framework-native path below; the builder and PortableSpec are useful later,
when you need to generate or transmit charts.

## Create a SvelteKit app

Start with Node.js 22 or newer in an empty directory:

\`\`\`sh complete
npx sv create my-chart --template minimal --types ts --no-add-ons --install npm
cd my-chart
\`\`\`

Already have a supported SvelteKit app? Continue with the install step.

## Install ggsvelte

Choose the package manager already used by the app:

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

Run the app with your package manager's standard dev command and open the
local URL it prints. The chart fills a normal positive-width block container
and uses the default 400px height. No chart CSS or fixed width is required.

## You have a chart

The first useful model is small: \`GGPlot\` owns the chart, \`data\` supplies
rows, \`aes\` maps fields, and \`GeomPoint\` adds the point layer. Change the
four rows or the \`x\` and \`y\` field names to adapt it.

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

Use the builder to construct specs programmatically in TypeScript. Fragment,
assuming the \`cars\` data from the complete file above:

\`\`\`ts fragment
${QUICKSTART_BUILDER_FRAGMENT}
\`\`\`

### PortableSpec JSON

Use PortableSpec when a chart must be saved, transmitted, validated, or
generated without executable accessors. Fragment equivalent to the first
chart:

\`\`\`json fragment
${QUICKSTART_PORTABLE_SPEC_FRAGMENT}
\`\`\`

## Headless and server rendering

\`renderToSVGString\` is the pure no-DOM export path. The installed
\`ggsvelte-render\` CLI writes SVG to stdout and JSON Lines diagnostics to
stderr. These are fragments; use the complete PortableSpec above as \`spec\`
or save it as \`spec.json\`.

\`\`\`ts fragment
${QUICKSTART_HEADLESS_FRAGMENT}
\`\`\`

\`\`\`sh fragment
${QUICKSTART_CLI_FRAGMENT}
\`\`\`

## Validating specs

\`validate(spec)\` checks schema shape. \`validate(spec, { profile })\` adds
data-aware checks without shipping the data. Every validation error has a
stable code, path, message, and fix. Pass \`{ lint: true }\` to also receive
advisories for valid-but-questionable specs.

## Where next

- [Examples gallery](/examples) — runnable charts across marks, statistics,
  scales, themes, and interaction.
- [Interactions](/guide/interactions) — inspection, selection, zoom, typed
  events, keyboard behavior, and stable identity.
- [PortableSpec playground](/playground) — open a compatible example, edit a
  bounded local PortableSpec, and copy complete Svelte or an explicit share URL
  without uploads, remote fetches, or code execution.
- [Compatibility](/guide/compatibility) — tested Node, Svelte, installer,
  browser, and operating-system boundaries.
- [Errors reference](/guide/errors) — validation, render, interaction, and CLI
  diagnostics with consequences and safe recovery steps.
- [JSON Schema](/schema/v0.json) — PortableSpec for constrained decoding.
`;

export const DATA_MAPPINGS_MD = `# Data and mappings

Start with ordinary rows. A mapping names which field supplies each visual
channel; it does not rewrite the source objects.

## Map fields to position

This fragment maps numeric fields to the horizontal and vertical position
channels:

\`\`\`svelte fragment
aes={{ x: "weight", y: "economy" }}
\`\`\`

A field mapping is explicit data meaning. Change the mapping without reshaping
the rows, or change the rows while keeping the same chart grammar. The
[scatter with color example](/examples/point/scatter-color) adds one discrete
channel while preserving the positional fields.

## Keep data local

Inline rows, named datasets, and PortableSpec data all pass through validation
and normalization before rendering. The documentation playground opens only
bounded portable seeds, keeps the last render-confirmed chart on failure, and
remains local-only; it does not upload chart data.
`;

export const LAYERS_MARKS_MD = `# Layers and marks

A plot is an ordered composition. Add a mark without replacing the data or the
mappings already owned by the plot.

## Compose layers

This fragment draws a line first and points over it:

\`\`\`svelte fragment
<GeomLine />
<GeomPoint />
\`\`\`

Layers paint in source order. They inherit plot mappings unless a layer supplies
its own mapping or data. See the [multi-series line example](/examples/line/multi-series)
for the same composition with a stable discrete color scale.

## Choose a mark for the question

Use points for records, lines for ordered change, columns for precomputed
heights, bars for counts, and rules/text for annotation. The
[Gallery](/examples) keeps each mark attached to a real rendered example.
`;

export const STATISTICS_POSITIONS_MD = `# Statistics and positions

Statistics derive marks from mapped rows; positions decide how marks share the
same coordinate space. Keep raw evidence visible when a summary could hide it.

## Statistical summaries

Add a fitted trend without replacing the observations:

\`\`\`svelte fragment
<GeomPoint />
<GeomSmooth method="lm" />
\`\`\`

The [loess example](/examples/smooth/loess-scatter) shows a smoother and
confidence ribbon over the source points. Histograms, density, boxplots, and
error bars use the same derive-then-render boundary.

## Positions

Stack combines values, dodge places groups side by side, fill normalizes each
stack to one, and jitter separates overlapping points with a deterministic
seed. Compare the [bar examples](/examples?category=bar) before overriding a
position.
`;

export const SCALES_GUIDES_MD = `# Scales and guides

A scale translates a data domain into position, color, size, or labels. Axes
and legends explain that translation; they do not own the data meaning.

## Categorical color

Use a named categorical scheme when color identifies groups:

\`\`\`svelte fragment
aes={{ x: "weight", y: "economy", color: "vehicleClass" }}
scales={{ color: { type: "ordinal", scheme: "observable10" } }}
\`\`\`

Stable assignments preserve category identity as rows filter or reorder. See
all registered schemes, capacities, and exhaustion behavior on
[Themes and color](/themes).

## Date and time axes

Declare a time scale for ISO 8601 values and let the scale choose UTC calendar
ticks. Pin breaks or labels only when the audience needs a fixed convention.
The [time-axis example](/examples/line/time-axis) is the runnable contract.
`;

export const FACETS_COORDINATES_MD = `# Facets and coordinates

Facets partition rows into panels before panel statistics run. Coordinates
control how trained scales are presented.

## Facet a comparison

Repeat one grammar for each group:

\`\`\`svelte fragment
facet={{ wrap: "vehicleClass", ncol: 2 }}
\`\`\`

Fixed scales support direct panel comparison. Free scales make within-panel
shape easier to see but weaken cross-panel magnitude comparison. Use the
[facet wrap](/examples/facet/wrap) and [free-y](/examples/facet/wrap-free-y)
examples to choose deliberately.

## Coordinates

Use coordinate flip for horizontal composition rather than swapping semantic
mappings. The [horizontal bar example](/examples/bar/horizontal) preserves the
ordinary category/value grammar and flips the presentation.
`;

export const THEMES_COLOR_MD = `# Themes and color

Chart theme controls furniture: paper, ink, grid, type, and interaction roles.
Scales control data color. The surrounding documentation appearance controls
neither unless follow mode is explicit.

## Choose a chart theme

Pass a registered theme without changing mappings:

\`\`\`svelte fragment
theme="economist"
\`\`\`

Compare all twelve live themes, categorical schemes, sequential ramps, custom
ranges, and safe failure behavior on the [Themes and color destination](/themes).

## Preserve color meaning

Explicit scale range wins over named scheme, which wins over the edition
default. Switching chart furniture must not reassign categories or reverse a
quantitative ramp.
`;

export const INSPECT_PIN_MD = `# Inspect and pin

Inspection is chart-local presentation state: a semantic crosshair, HTML
tooltip, keyboard traversal, and an optional pinned result.

## Inspect and pin

Supply a stable row key and opt into the behavior:

\`\`\`svelte fragment
<GGPlot
  key="id"
  inspect={{ mode: "exact", pin: true }}
/>
\`\`\`

Pointer, touch, and keyboard paths report the same semantic datum. Enter or
Space pins; Escape dismisses. Try the [inspection example](/examples/interaction/tooltip).

## Keep ownership honest

Tooltip, crosshair, active tool, and pin state remain private to one chart.
Use a shared controller only for semantic selection, emphasis, intervals, or
zoom domains that ordinary application UI also consumes.
`;

export const SELECTION_ZOOM_MD = `# Selection and zoom

Selection identifies data; zoom changes visible domains. Explicit tools keep
those gestures from competing with inspection or page scrolling.

## Select points

Point selection requires stable keys and emits semantic identities instead of
renderer indices.

\`\`\`svelte fragment
<GGPlot key="id" select={{ type: "point", multiple: true }} />
\`\`\`

## Select an area and zoom

Interval selection and brush zoom expose separate tools, domain bounds, clear
paths, and precise keyboard-editable bounds. Try the
[selection and zoom example](/examples/interaction/brush-zoom) before combining
the capabilities in application code.
`;

export const LINKED_VIEWS_MD = `# Linked views

Share semantic state only when plots, controls, or tables need the same
selection, emphasis, interval, or domain.

## Create a shared controller

\`\`\`svelte fragment
const interaction = createPlotInteraction<string>();
const scope = { keys: "record-id", x: "weight", y: "economy" } as const;
\`\`\`

Every linked consumer receives the same explicit scope. Passive plots render a
transition without publishing it again. The
[linked views example](/examples/interaction/linked-views) coordinates two
plots, buttons, and a table without callback loops.

## Keep local state local

Inspection, tooltip, crosshair, active tool, and interval drafts stay local.
Share the committed semantic result, not renderer pixels or private UI mode.
`;

export const ACCESSIBILITY_MD = `# Accessibility

A chart needs a useful accessible name, keyboard and touch interaction paths,
visible focus, concise announcements, and a data-detail alternative when marks
are dense.

## Name the chart

\`\`\`svelte fragment
<GGPlot ariaLabel="Fuel economy decreases as vehicle weight increases" />
\`\`\`

The name states the chart's subject or takeaway. It is not generic image alt
text and does not replace a visible caption.

## Keyboard and touch

Focus the chart and use arrows or brackets to traverse data. Enter or Space
pins or commits the active tool; Escape dismisses. Touch inspection pins rather
than depending on hover. The [inspection example](/examples/interaction/tooltip)
keeps complete pinned content in ordinary labelled DOM.

## Dense charts

Canvas marks retain SVG axes and legends plus the existing accessible
description/table path. Forced colors preserves controls and focus even when
system colors replace chart paint.
`;

export const RESPONSIVE_CHARTS_MD = `# Responsive charts

Omit width to let GGPlot observe its container. A normal positive-width block
needs no chart CSS; omitted height uses the specification and then 400px.

## Container width

A collapsed parent, hidden tab, or zero-width grid track keeps the plot
not-ready until ResizeObserver reports positive width. Do not patch that state
with an arbitrary fixed chart width. Follow the
[container troubleshooting path](/guide/errors#quickstart-troubleshooting).

## Server fallback and hydration

Responsive charts server-render at a deterministic 640 × 400 fallback, remain
not-ready in server HTML, then measure the real container after hydration.
Reserve layout space around the chart to avoid page shift.
`;

export const RENDERING_PERFORMANCE_MD = `# Rendering and performance

Renderer choice belongs to mark density and interaction needs, not to a site
appearance. Axes, legends, labels, and accessibility remain semantic chrome.

## SVG, canvas, and auto

SVG keeps marks as DOM geometry. Canvas batches dense marks. Auto rendering
moves eligible dense strata above the published threshold and emits the
\`canvas-auto\` advisory. The [10k-point example](/examples/point/canvas-scatter)
shows canvas marks under SVG axes and legend.

## Canvas and interaction

Inspection and semantic selection use the model-owned candidate store rather
than DOM nodes. Stable keys preserve identity across SVG and canvas; renderer
indices never enter public callbacks.

## Measure before overriding

Use the performance fixtures and advisories already shipped with the repository.
Do not infer a faster renderer from screenshot timing or add a global canvas
rule that removes useful SVG detail.
`;

export const SERVER_RENDERING_EXPORT_MD = `# Server rendering and export

Choose the Svelte component for application SSR, the pure core renderer for a
no-DOM process, or the installed CLI for shell composition. All paths consume
the same portable specification contract.

## Server rendering

[Server rendering](/guide/server-rendering-export#server-rendering) uses the
same deterministic layout fallback as the responsive component. Browser-only
measurement and interaction attach after hydration.

## Pure SVG export

\`\`\`ts fragment
import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 640, height: 400 });
\`\`\`

The pure renderer needs no DOM and returns a complete SVG string.

## Command-line export

\`\`\`sh fragment
ggsvelte-render spec.json > chart.svg
\`\`\`

SVG is stdout. Diagnostics are JSON Lines on stderr, so shell redirection stays
safe. The [CLI reference](/reference/cli) lists flags and exit classes from its
implementation.
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
\`model.scaleDiagnostics\` as stable problem/cause/fix records.

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

ggsvelte keeps static charts static. Opt in to only the behaviors the chart
needs with \`inspect\`, \`select\`, \`zoom\`, \`legendFocus\`, and
\`legendFilter\`. Once more than one drawing behavior is
available, the chart renders an accessible tool rail so inspection, selection,
and zoom never compete for the same drag or click.

Interaction state has two deliberate ownership models. Without a controller,
inspection, selection, and zoom are private to one chart and callbacks report
what changed. Pass a \`createPlotInteraction()\` controller when plots, controls,
tables, or other Svelte components should share semantic state.

Start with the runnable [inspection and pinning example](/examples/interactions/inspection),
the [interval selection and zoom example](/examples/interactions/interval-selection),
the [linked plots, controls, and table example](/examples/interaction/linked-views),
the [linked legend focus example](/examples/interaction/legend-focus),
the [stable-color legend filter example](/examples/interaction/legend-filter),
the [faceted interval example](/examples/interaction/facet-intervals),
or [adapt a bounded PortableSpec in the local playground](/playground). For exact
props, callbacks, phases, and diagnostics, use the
[interaction reference](/guide/interaction-reference).

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

Legend focus answers “which group should I compare?” without changing data.
\`legendFilter={true}\` answers “which groups belong in this computation?” by
adding native Show-group checkboxes to discrete color and fill legends. A
filter runs before facets, statistics, scales, layout, and rendering. Hidden
groups remain in the legend catalog and recover the same categorical color when
shown again.

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

This page is the searchable interaction contract. Charts own private state by
default and emit chart-local callbacks. \`createPlotInteraction()\` opts into
controlled semantic state shared by plots and ordinary Svelte components.

## Static default

Charts have no capture layer, tooltip, selection state, or zoom behavior until
the corresponding capability is enabled. This keeps ordinary charts light and
prevents interaction gestures from competing with page scrolling.

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
    summary: "Keep capture layers and gestures out of charts until a capability is enabled.",
    href: "/guide/interaction-reference#static-default",
    keywords: ["opt in", "capture", "scroll"],
  },
  {
    id: "inspect",
    name: "Inspect and pin",
    summary: "Show an HTML tooltip and semantic crosshair with pointer and keyboard traversal.",
    href: "/guide/interaction-reference#inspect",
    keywords: ["tooltip", "crosshair", "pin", "keyboard"],
  },
  {
    id: "point-selection",
    name: "Point selection",
    summary:
      "Select one or many data records using stable semantic keys instead of renderer indices.",
    href: "/guide/interaction-reference#point-selection",
    keywords: ["select", "multiple", "keys"],
  },
  {
    id: "interval-selection",
    name: "Interval selection",
    summary:
      "Brush an explicit rectangular area and receive domain, pixel, and semantic-key bounds.",
    href: "/guide/interaction-reference#interval-selection",
    keywords: ["brush", "rectangle", "domain", "facet", "union", "cross-panel"],
  },
  {
    id: "zoom",
    name: "Brush zoom",
    summary: "Zoom one or both axes with an explicit area tool and a predictable reset path.",
    href: "/guide/interaction-reference#zoom",
    keywords: ["domain", "reset", "double click"],
  },
  {
    id: "legend-focus",
    name: "Legend focus",
    summary: "Preview or commit discrete legend groups across linked SVG and canvas views.",
    href: "/guide/interaction-reference#legendfocus",
    keywords: ["legendFocus", "onlegendfocus", "emphasis", "keyboard", "touch"],
  },
  {
    id: "legend-filter",
    name: "Legend filtering",
    summary:
      "Include or exclude discrete groups before statistics and scales without changing color identity.",
    href: "/guide/interaction-reference#legendfilter",
    keywords: ["legendFilter", "onlegendfilter", "filter", "checkbox", "stable color"],
  },
  {
    id: "controlled-tool",
    name: "Controlled tool",
    summary: "Synchronize the active Inspect, Select area, or Zoom area mode with Svelte state.",
    href: "/guide/interaction-reference#controlled-tool",
    keywords: ["tool", "ontoolchange", "state"],
  },
  {
    id: "shared-controller",
    name: "Shared controller",
    summary:
      "Link plots, controls, and tables with scoped semantic selection, emphasis, and domains.",
    href: "/guide/interaction-reference#shared-controller",
    keywords: ["createPlotInteraction", "linked views", "scope", "reconcileKeys"],
  },
  {
    id: "identity",
    name: "Stable identity",
    summary: "Preserve inspection and selection across updates with unique application-level keys.",
    href: "/guide/interaction-reference#identity",
    keywords: ["key", "lineage", "sourceKeys"],
  },
  {
    id: "events",
    name: "Typed events",
    summary:
      "Handle focused callbacks or one discriminated interaction event union with explicit phases.",
    href: "/guide/interaction-reference#events",
    keywords: ["oninspect", "onselect", "onzoom", "oninteraction", "phase"],
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    summary:
      "Respond to structured codes, suggestions, affected props, and exact documentation links.",
    href: "/guide/interaction-reference#diagnostics",
    keywords: ["ondiagnostic", "warning", "error", "suggestions"],
  },
  {
    id: "accessibility",
    name: "Accessibility",
    summary:
      "Use keyboard traversal, precise bounds, concise announcements, labelled DOM, and explicit area tools.",
    href: "/guide/interaction-reference#accessibility",
    keywords: ["screen reader", "keyboard", "live region", "focus", "bounds", "ISO 8601"],
  },
];

export const MIGRATING_PRE_0_1_MD = `# Migrating pre-0.1 interactions

The pre-release interaction API now names user intent instead of presentation.
This is a source migration: update props, callback payload handling, and custom
tooltip snippets together.

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

function catalogSection(
  title: string,
  intro: string,
  catalog: Record<string, { summary: string; fix?: string }>,
  opts: { tierOf?: (code: string) => string } = {},
): string {
  const lines = [`## ${title}`, "", intro, ""];
  for (const [code, entry] of Object.entries(catalog)) {
    const tier = opts.tierOf === undefined ? "" : ` (${opts.tierOf(code)})`;
    lines.push(`### \`${code}\`${tier}`, "", entry.summary, "");
    if (entry.fix !== undefined) lines.push(`**Fix:** ${entry.fix}`, "");
  }
  return lines.join("\n");
}

const diagnosticSectionTitles: Record<DiagnosticDocSource, string> = {
  validation: "Validation errors (@ggsvelte/spec)",
  pipeline: "Render-time errors (@ggsvelte/core)",
  warning: "Render warnings",
  interaction: "Interaction diagnostics (@ggsvelte/svelte)",
  cli: "CLI diagnostics (ggsvelte-render)",
};

function diagnosticHeading(entry: DiagnosticDocEntry): string {
  const primaryAnchor = entry.code
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
  return entry.anchor === primaryAnchor
    ? `### \`${entry.code}\``
    : `### \`${entry.code}\` — ${entry.source}`;
}

function renderDiagnosticEntry(entry: DiagnosticDocEntry): string {
  const lines = [
    diagnosticHeading(entry),
    "",
    `**Code + severity:** \`${entry.code}\` · ${entry.severity}`,
    "",
    `**What failed:** ${entry.whatFailed}`,
    "",
    `**Why:** ${entry.why}`,
    "",
    `**Fix:** ${entry.fix}`,
    "",
    `**Consequence (${entry.consequence}):** ${entry.consequenceText}`,
    "",
    `**Stable link:** [/guide/errors#${entry.anchor}](/guide/errors#${entry.anchor})`,
    "",
  ];
  if (entry.recipe !== undefined) {
    lines.push(
      "**Minimal illustration — copy only the relevant fragment:**",
      "",
      `\`\`\`${entry.recipe.language} fragment copy`,
      entry.recipe.code,
      "```",
      "",
    );
  }
  return lines.join("\n");
}

export function buildErrorsMd(): string {
  const entries = buildDiagnosticDocs();
  const sections = (Object.keys(diagnosticSectionTitles) as DiagnosticDocSource[]).map((source) => {
    const intro =
      source === "cli"
        ? "SVG is written only to stdout; JSON Lines diagnostics are written only to stderr. Exit 1 means rendering failed, exit 2 means usage/input failed, and exit 3 means spec validation failed."
        : "Each entry answers what failed, why, how to recover safely, and whether output was blocked or degraded.";
    return [
      `## ${diagnosticSectionTitles[source]}`,
      "",
      intro,
      "",
      ...entries
        .filter((entry) => entry.source === source)
        .map((entry) => renderDiagnosticEntry(entry)),
    ].join("\n");
  });

  return `# Errors reference

Diagnostics are generated from the catalogs used by validation, rendering,
interaction, and the CLI. Identity is the pair \`(source, code)\`: a bare code
can intentionally exist in more than one source with a different consequence.

## Quickstart troubleshooting

- **Collapsed or zero-width container:** the responsive plot remains
  \`data-gg-ready="false"\` until ResizeObserver reports a positive width.
  Give the parent a real grid/flex track width; no fixed chart width is needed.
- **SSR and hydration:** omitted width server-renders at 640 × 400, stays
  not-ready on the server, then measures its real container after hydration.
- **Unexpected height:** omitted height is 400px unless the spec supplies one.
- **TypeScript or linked-package mismatch:** install one compatible
  \`@ggsvelte/svelte\` version and let it resolve matching core/spec packages;
  remove stale lockfile overrides that mix versions.
- **CLI input failure:** run \`ggsvelte-render --help\`; keep SVG stdout
  separate from JSON Lines stderr while correcting the reported input.

${sections.join("\n\n")}
`;
}

export function buildAdvisoriesMd(): string {
  const lint = catalogSection(
    "Spec-lint advisories (@ggsvelte/spec lintSpec)",
    'Valid-but-questionable specs (Hadley: "we can produce many plots that don\'t make sense, yet are grammatically valid"). Run `lintSpec(spec, { profile? })` directly, pass `{ lint: true }` to `validate()`, or read the CLI\'s stderr advisories (source "spec-lint"). Data-dependent rules skip silently without evidence.',
    LINT_CATALOG,
    {
      tierOf: (code) => `needs: ${LINT_CATALOG[code as keyof typeof LINT_CATALOG].needs}`,
    },
  );
  const heuristics = catalogSection(
    "Pipeline heuristic advisories (@ggsvelte/core)",
    "Every heuristic decision the pipeline takes is disclosed as `{ code, path, chosen, howToOverride }` on `RenderModel.advisories` — agents see the guess and can correct it.",
    ADVISORY_CATALOG,
  );
  return `# Advisories

Advisories never block a render. Two distinct kinds, two sources:

${lint}

${heuristics}
`;
}

/** Shape of the generated lifecycle.json document (scripts/gen-lifecycle.ts). */
export interface LifecycleDoc {
  tags: readonly string[];
  surfaces: readonly {
    package: string;
    entry: string;
    source: string;
    exports: Record<string, { kind: "value" | "type"; lifecycle: string }>;
  }[];
}

export function buildLifecycleMd(lifecycle: LifecycleDoc): string {
  const sections = lifecycle.surfaces.map((surface) => {
    const byTag = new Map<string, string[]>();
    for (const [name, meta] of Object.entries(surface.exports)) {
      const list = byTag.get(meta.lifecycle) ?? [];
      list.push(meta.kind === "type" ? `\`${name}\` (type)` : `\`${name}\``);
      byTag.set(meta.lifecycle, list);
    }
    const parts = [
      `## ${surface.package}${surface.entry === "." ? "" : ` (${surface.entry})`}`,
      "",
    ];
    for (const tag of lifecycle.tags) {
      const names = byTag.get(tag);
      if (names === undefined) continue;
      parts.push(`### ${tag} (${String(names.length)})`, "", names.join(", "), "");
    }
    return parts.join("\n");
  });
  return `# Lifecycle & editions

## Lifecycle tags

Every public export carries a lifecycle tag (generated into
\`lifecycle.json\` from the source annotations — regenerate with
\`bun run lifecycle:gen\`):

- **experimental** — may change or disappear in any 0.x release. The default
  for APIs not explicitly promoted.
- **stable-intent** — the agent core path (PortableSpec, normalize, validate,
  renderToSVGString, GGPlot and their direct result contracts). Not frozen
  pre-1.0, but changes here are treated as breaking: they get a changeset, a
  migration note, and a deprecation window where feasible.
- **stable** — committed API under semver (none in v0.1).
- **superseded** — keeps working but stops being recommended; docs point to
  the replacement. Protects agent-generated code from silent breakage.

## Defaults editions

\`normalize()\` stamps \`edition: 1\` onto every spec that doesn't carry one,
freezing which generation of DEFAULT aesthetics (theme role tokens,
categorical palette, sequential ramp) the spec was authored against. When a
future edition ships better defaults, stamped specs keep their original look
— old charts never reshuffle. Explicit settings (\`theme\`,
\`scales.*.range\`, \`scales.*.scheme\`) always win over edition defaults, and
unknown editions degrade to the latest known with an \`unknown-edition\`
warning.

${sections.join("\n")}
`;
}

// ---------------------------------------------------------------------------
// llms.txt / llms-full.txt
// ---------------------------------------------------------------------------

/** Manifest-entry shape consumed here (structural subset of the manifest). */
export interface LlmsExampleEntry {
  id: string;
  title: string;
  description: string;
  tags: readonly string[];
  docsSection: string;
}

export interface LlmsFullExample extends LlmsExampleEntry {
  /** Canonical PortableSpec, pretty-printed JSON. */
  specJSON: string;
  /** The Example.svelte source. */
  svelteSource: string;
}

export interface GuidePage {
  slug: string;
  title: string;
  description: string;
  markdown: string;
}

export function guidePages(lifecycle: LifecycleDoc): GuidePage[] {
  const markdownBySlug: Record<GuideSlug, string> = {
    "getting-started": GETTING_STARTED_MD,
    "data-mappings": DATA_MAPPINGS_MD,
    "layers-marks": LAYERS_MARKS_MD,
    "statistics-positions": STATISTICS_POSITIONS_MD,
    "scales-guides": SCALES_GUIDES_MD,
    "facets-coordinates": FACETS_COORDINATES_MD,
    "themes-color": THEMES_COLOR_MD,
    "temporal-scales": TEMPORAL_SCALES_MD,
    interactions: INTERACTIONS_MD,
    "inspect-pin": INSPECT_PIN_MD,
    "selection-zoom": SELECTION_ZOOM_MD,
    "linked-views": LINKED_VIEWS_MD,
    accessibility: ACCESSIBILITY_MD,
    "responsive-charts": RESPONSIVE_CHARTS_MD,
    "rendering-performance": RENDERING_PERFORMANCE_MD,
    "server-rendering-export": SERVER_RENDERING_EXPORT_MD,
    compatibility: COMPATIBILITY_MD,
    "interaction-reference": INTERACTION_REFERENCE_MD,
    errors: buildErrorsMd(),
    advisories: buildAdvisoriesMd(),
    lifecycle: buildLifecycleMd(lifecycle),
    "migrating-pre-0-1": MIGRATING_PRE_0_1_MD,
    upgrading: UPGRADING_MD,
  };

  return GUIDE_CATALOG.map(({ slug, title, description }) => {
    const markdown = markdownBySlug[slug];
    assertGuideCodeContract(markdown, slug);
    return { slug, title, description, markdown };
  });
}

/** llms.txt — the curated index (llmstxt.org shape: H1, blurb, link lists). */
export function buildLlmsIndex(
  pages: readonly GuidePage[],
  examples: readonly LlmsExampleEntry[],
): string {
  const lines = [
    "# ggsvelte",
    "",
    "> A layered grammar of graphics for JavaScript: ggplot2 semantics (aes/geom/stat/scale/coord/facet/theme/position), a strictly-JSON PortableSpec that agents emit (published JSON Schema for constrained decoding), a fluent builder, Svelte 5 components, hybrid SVG/canvas rendering, and value-stable color scales. validate() returns { code, path, message, fix } errors whose fix.example is machine-applicable.",
    "",
    "## Docs",
    "",
  ];
  for (const page of pages) {
    lines.push(`- [${page.title}](/guide/${page.slug}): ${page.description}`);
  }
  lines.push(
    "- [PortableSpec playground](/playground): open a compatible example, edit bounded local JSON, and copy complete Svelte or an explicit share URL",
    "- [Search interaction reference](/reference/interactions): filter interaction capabilities, events, diagnostics, and accessibility guidance",
    "- [JSON Schema v0](/schema/v0.json): the PortableSpec schema (unstable in v0.1)",
    "- [llms-full.txt](/llms-full.txt): all docs prose plus every example (spec JSON + Svelte source)",
    "",
    "## Examples",
    "",
  );
  let section = "";
  for (const ex of examples) {
    if (ex.docsSection !== section) {
      section = ex.docsSection;
      lines.push("", `### ${section}`, "");
    }
    lines.push(`- [${ex.title}](/examples/${ex.id}): ${ex.description}`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Cap a spec's inline data for the llms-full listing (a 10k-row canvas
 * example would otherwise dominate the file): values arrays and column
 * arrays are truncated to `maxRows`, and the count of pruned rows is
 * returned so the listing can say so. The spec's structure is untouched.
 */
export function pruneSpecData(spec: unknown, maxRows = 20): { spec: unknown; prunedRows: number } {
  let prunedRows = 0;
  const pruneData = (data: unknown): unknown => {
    if (typeof data !== "object" || data === null) return data;
    const d = data as Record<string, unknown>;
    if (Array.isArray(d["values"]) && d["values"].length > maxRows) {
      prunedRows += d["values"].length - maxRows;
      return { ...d, values: d["values"].slice(0, maxRows) };
    }
    if (typeof d["columns"] === "object" && d["columns"] !== null) {
      const columns = d["columns"] as Record<string, unknown>;
      let pruned = false;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(columns)) {
        if (Array.isArray(v) && v.length > maxRows) {
          if (!pruned) prunedRows += v.length - maxRows;
          pruned = true;
          out[k] = v.slice(0, maxRows);
        } else {
          out[k] = v;
        }
      }
      return pruned ? { ...d, columns: out } : d;
    }
    return data;
  };
  if (typeof spec !== "object" || spec === null) return { spec, prunedRows };
  const s = spec as Record<string, unknown>;
  const out: Record<string, unknown> = { ...s };
  if (out["data"] !== undefined) out["data"] = pruneData(out["data"]);
  if (typeof out["datasets"] === "object" && out["datasets"] !== null) {
    const datasets: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(out["datasets"] as Record<string, unknown>)) {
      datasets[k] = pruneData(v);
    }
    out["datasets"] = datasets;
  }
  return { spec: out, prunedRows };
}

/** llms-full.txt — all guide prose + every example, from the manifest. */
export function buildLlmsFull(
  pages: readonly GuidePage[],
  examples: readonly LlmsFullExample[],
): string {
  const parts = [
    "# ggsvelte — full docs corpus for language models",
    "",
    "Generated from the docs guide sources and the examples manifest (one source, three uses). Each example shows its canonical PortableSpec JSON (what an agent should emit) and the equivalent Svelte component usage.",
    "",
    "---",
    "",
  ];
  for (const page of pages) {
    parts.push(page.markdown.trim(), "", "---", "");
  }
  parts.push("# Examples", "");
  for (const ex of examples) {
    parts.push(
      `## ${ex.title} (${ex.id})`,
      "",
      ex.description,
      "",
      `Tags: ${ex.tags.join(", ")}`,
      "",
      "Spec (canonical PortableSpec JSON):",
      "",
      "```json",
      ex.specJSON.trim(),
      "```",
      "",
      "Svelte usage:",
      "",
      "```svelte",
      ex.svelteSource.trim(),
      "```",
      "",
    );
  }
  return parts.join("\n");
}
