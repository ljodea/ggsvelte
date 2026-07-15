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
import {
  ADVISORY_CATALOG,
  CLI_DIAGNOSTIC_CATALOG,
  PIPELINE_ERROR_CATALOG,
  PIPELINE_WARNING_CATALOG,
} from "@ggsvelte/core";
import { ERROR_CATALOG, LINT_CATALOG } from "@ggsvelte/spec";

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

/** Render the markdown subset used by the guide sections to HTML. */
export function renderMarkdown(md: string, base = ""): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] | null = null;
  let code: string[] | null = null;
  let codeLang = "";

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

  for (const line of lines) {
    if (code !== null) {
      if (line.startsWith("```")) {
        html.push(
          `<pre><code${codeLang === "" ? "" : ` class="language-${codeLang}"`}>${escapeHtml(code.join("\n"))}</code></pre>`,
        );
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      codeLang = line.slice(3).trim();
      code = [];
      continue;
    }
    const heading = /^(#{1,4}) (.*)$/.exec(line);
    if (heading !== null) {
      flushParagraph();
      flushList();
      const level = heading[1]!.length;
      html.push(`<h${level}>${inline(heading[2]!, base)}</h${level}>`);
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
  if (code !== null) html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  return html.join("\n");
}

// ---------------------------------------------------------------------------
// Guide sections (markdown; single source for docs pages AND llms surfaces)
// ---------------------------------------------------------------------------

export const GETTING_STARTED_MD = `# Getting started

ggsvelte is a layered grammar of graphics for JavaScript: ggplot2 semantics
(aes, geom, stat, scale, coord, facet, theme, position), a strictly-JSON
\`PortableSpec\` at the center, and three surfaces that compile to the same
canonical spec — JSON for agents, a fluent builder, and Svelte 5 components.

## Install

\`\`\`sh
bun add ggsvelte        # or: npm install ggsvelte
\`\`\`

The \`ggsvelte\` package re-exports the whole surface (\`@ggsvelte/spec\` and
\`@ggsvelte/core\` are its dependencies — install them directly only for
spec-only / core-only usage without Svelte) and owns the \`ggsvelte-render\`
CLI.

## First chart, three ways

The same scatter plot in each surface. All three produce (or consume) the
same canonical PortableSpec.

**1. Spec JSON** — what agents emit; validated by the published JSON Schema:

\`\`\`svelte
<script>
  import { GGPlot } from "ggsvelte";

  const spec = {
    data: { values: [{ displ: 1.8, hwy: 29 }, { displ: 5.7, hwy: 16 }] },
    layers: [
      {
        geom: "point",
        aes: { x: { field: "displ" }, y: { field: "hwy" } }
      }
    ]
  };
</script>

<GGPlot {spec} width={640} height={400} />
\`\`\`

**2. Fluent builder** — immutable chaining, \`.spec()\` validates and returns
the canonical PortableSpec:

\`\`\`ts
import { aes, gg } from "ggsvelte";

const spec = gg(rows, aes({ x: "displ", y: "hwy" })).geomPoint().spec();
\`\`\`

**3. Svelte components** — declaration-only children as sugar:

\`\`\`svelte
<script>
  import { GGPlot, GeomPoint } from "ggsvelte";
  import { rows } from "./data.js";
</script>

<GGPlot data={rows} aes={{ x: "displ", y: "hwy" }} width={640} height={400}>
  <GeomPoint />
</GGPlot>
\`\`\`

## Headless / server rendering

\`renderToSVGString\` is the pure export path (no DOM, all-SVG; safe in
Node/edge/workers), and \`ggsvelte-render\` is the same thing as a CLI:

\`\`\`ts
import { renderToSVGString } from "@ggsvelte/core";

const svg = renderToSVGString(spec, { width: 640, height: 400 });
\`\`\`

\`\`\`sh
ggsvelte-render spec.json > chart.svg   # diagnostics: JSON lines on stderr
\`\`\`

## Validating specs (agents: read this)

\`validate(spec)\` checks schema shape (tier 1, no data needed);
\`validate(spec, { profile })\` adds data-aware checks against a
\`DataProfile\` — \`{ fields: [{ name, type }], rowCount? }\` — without
shipping the data. Every error is \`{ code, path, message, allowed?, fix }\`
and **the fix carries a machine-applicable example — apply it**. Pass
\`{ lint: true }\` to also get advisories for valid-but-questionable specs.

## Where next

- [Examples gallery](/examples) — every example shows the Svelte component,
  the builder chain, and the canonical spec JSON side by side.
- [Interactions](/guide/interactions) — inspection, selection, zoom, typed
  events, keyboard behavior, and stable identity.
- [Pre-0.1 interaction migration](/guide/migrating-pre-0-1) — replace the old
  tooltip and brush props and callback payloads.
- [Errors reference](/guide/errors) — every validation and render diagnostic.
- [Spec-lint advisories](/guide/advisories) — meaningless-but-valid specs.
- [Lifecycle & editions](/guide/lifecycle) — API stability tags and the
  defaults-edition mechanism.
- [JSON Schema](/schema/v0.json) — for constrained decoding.
- [llms-full.txt](/llms-full.txt) — the whole docs corpus in one file.
`;

export const INTERACTIONS_MD = `# Interactions

ggsvelte keeps static charts static. Opt in to only the behaviors the chart
needs with \`inspect\`, \`select\`, and \`zoom\`. Once more than one behavior is
available, the chart renders an accessible tool rail so inspection, selection,
and zoom never compete for the same drag or click.

## Inspection

\`inspect={true}\` enables the default HTML tooltip, semantic crosshair,
keyboard traversal, and click-or-Enter pinning. Configure it when the chart
has a natural comparison axis:

\`\`\`svelte
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

\`\`\`svelte
{#snippet details(inspection)}
  <strong>{inspection.focus.row?.name}</strong>
  <span>{inspection.members.length} series at this value</span>
{/snippet}

<GGPlot inspect={{ mode: "x", content: details }} />
\`\`\`

## Point and interval selection

Point selection is durable identity, not a renderer index. Supply a unique,
stable string, number, or symbol for every source row:

\`\`\`svelte
<GGPlot key="id" select={{ type: "point", multiple: true }} />
\`\`\`

Use interval selection for brushing. The callback receives both the selected
domain and normalized plot-pixel rectangle, plus semantic keys and a lineage
count for aggregate marks.

\`\`\`svelte
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

Interval selection currently requires one unfaceted panel. A faceted request
emits \`INTERACTION_INTERVAL_FACET_UNSUPPORTED\` through \`ondiagnostic\` and is
disabled rather than behaving inconsistently.

## Brush zoom

\`zoom={true}\` enables two-dimensional brush zoom. Set \`zoom={{ mode: "x" }}\`
or \`zoom={{ mode: "y" }}\` for a single axis. The tool rail separates Zoom area
from Select area when both are enabled. A completed zoom emits explicit
domains; Reset zoom or double-click emits a clear event.

\`\`\`svelte
<GGPlot
  inspect={true}
  select={{ type: "interval", mode: "xy" }}
  zoom={{ mode: "xy" }}
  onzoom={(event) => console.log(event.domains)}
/>
\`\`\`

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

\`\`\`svelte
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

\`\`\`svelte
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

export function buildErrorsMd(): string {
  const validation = catalogSection(
    "Validation errors (@ggsvelte/spec)",
    "Returned by `validate()` as `{ code, path, message, allowed?, fix }`. Tier 1 = schema shape, no data needed; tier 2 runs when an options argument is passed (structural grammar rules + data-aware checks against inline data or a DataProfile). Instances carry a concrete `fix.example` — apply it.",
    ERROR_CATALOG,
    { tierOf: (code) => `tier ${String(ERROR_CATALOG[code as keyof typeof ERROR_CATALOG].tier)}` },
  );
  const pipeline = catalogSection(
    "Render-time errors (@ggsvelte/core)",
    "Thrown by `runPipeline` / `renderToSVGString` as `PipelineError { code, path, message }` — structured errors, never blank output (failure policy).",
    PIPELINE_ERROR_CATALOG,
  );
  const warnings = catalogSection(
    "Warnings",
    'Collected on `RenderModel.warnings` (deduplicated): degraded-but-rendered conditions. The CLI emits them as stderr JSON lines with kind "warning".',
    PIPELINE_WARNING_CATALOG,
  );
  const cli = catalogSection(
    "CLI diagnostics (ggsvelte-render)",
    "stderr JSON lines. Exit codes: 0 rendered, 1 render failed, 2 usage error, 3 invalid spec.",
    CLI_DIAGNOSTIC_CATALOG,
  );
  return `# Errors reference

Every diagnostic ggsvelte can produce, generated from the catalogs the code
itself uses (\`ERROR_CATALOG\` in @ggsvelte/spec; \`PIPELINE_ERROR_CATALOG\`,
\`PIPELINE_WARNING_CATALOG\`, \`CLI_DIAGNOSTIC_CATALOG\` in @ggsvelte/core) —
one source, no drift.

${validation}

${pipeline}

${warnings}

${cli}
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
  for everything pre-0.1.0.
- **stable-intent** — the agent core path (PortableSpec, normalize, validate,
  renderToSVGString, GGPlot and their direct result contracts). Not frozen
  pre-1.0, but changes here are treated as breaking: they get a changeset, a
  migration note, and a deprecation window where feasible.
- **stable** — committed API under semver (none pre-0.1.0).
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
  return [
    {
      slug: "getting-started",
      title: "Getting started",
      description: "Install ggsvelte and draw the same chart in all three surfaces.",
      markdown: GETTING_STARTED_MD,
    },
    {
      slug: "errors",
      title: "Errors reference",
      description: "Every validation error and render-time diagnostic, from the catalogs.",
      markdown: buildErrorsMd(),
    },
    {
      slug: "advisories",
      title: "Advisories",
      description: "Spec-lint advisories and the pipeline's disclosed heuristics.",
      markdown: buildAdvisoriesMd(),
    },
    {
      slug: "lifecycle",
      title: "Lifecycle & editions",
      description: "API stability tags per export, and the defaults-edition mechanism.",
      markdown: buildLifecycleMd(lifecycle),
    },
    {
      slug: "interactions",
      title: "Interactions",
      description: "Inspection, selection, zoom, keyboard behavior, identity, and event contracts.",
      markdown: INTERACTIONS_MD,
    },
    {
      slug: "migrating-pre-0-1",
      title: "Migrating pre-0.1 interactions",
      description: "Move from tooltip and brush props to semantic interaction capabilities.",
      markdown: MIGRATING_PRE_0_1_MD,
    },
  ];
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
    "- [JSON Schema v0](/schema/v0.json): the PortableSpec schema (unstable pre-0.1.0)",
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
