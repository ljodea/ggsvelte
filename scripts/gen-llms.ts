/**
 * gen-llms — ONE source for the docs guide prose and the agent-facing
 * `llms.txt` / `llms-full.txt` endpoints (plan: prerendered from the
 * manifest, zero manual upkeep; "one source, three uses").
 *
 * Module layout:
 * - `llms-markdown.ts` — minimal markdown renderer
 * - `llms-guide-content.ts` — guide prose constants + interaction reference
 * - this file — catalog-driven builders, guidePages, llms surfaces, re-exports
 *
 * Everything here is pure (data in, string out) and unit-tested in
 * scripts/gen-llms.test.ts; apps/docs imports it via the `$scripts` alias
 * for its prerendered endpoints and guide pages.
 */
import { ADVISORY_CATALOG } from "@ggsvelte/core";
import { CURRENT_EDITION, LINT_CATALOG, THEME_NAMES } from "@ggsvelte/spec";
import sveltePackage from "../packages/svelte/package.json";
import { GUIDE_CATALOG, type GuideSlug } from "../apps/docs/src/lib/catalog/guide";
import {
  buildDiagnosticDocs,
  type DiagnosticDocEntry,
  type DiagnosticDocSource,
} from "./diagnostic-docs";
import { assertGuideCodeContract } from "./guide-code-contract";
import {
  ACCESSIBILITY_MD,
  COMPATIBILITY_MD,
  DATA_MAPPINGS_MD,
  FACETS_COORDINATES_MD,
  GETTING_STARTED_MD,
  INSPECT_PIN_MD,
  INTERACTIONS_MD,
  INTERACTION_REFERENCE_MD,
  LAYERS_MARKS_MD,
  LINKED_VIEWS_MD,
  MIGRATING_PRE_0_1_MD,
  RENDERING_PERFORMANCE_MD,
  RESPONSIVE_CHARTS_MD,
  SCALES_GUIDES_MD,
  SELECTION_ZOOM_MD,
  SERVER_RENDERING_EXPORT_MD,
  STATISTICS_POSITIONS_MD,
  TEMPORAL_SCALES_MD,
  THEMES_COLOR_MD,
  UPGRADING_MD,
} from "./llms-guide-content";

export { buildDiagnosticDocs } from "./diagnostic-docs";
export { extractMarkdownHeadings, renderMarkdown, type MarkdownHeading } from "./llms-markdown";
export {
  ACCESSIBILITY_MD,
  COMPATIBILITY_MD,
  DATA_MAPPINGS_MD,
  FACETS_COORDINATES_MD,
  GETTING_STARTED_MD,
  INSPECT_PIN_MD,
  INTERACTIONS_MD,
  INTERACTION_REFERENCE_INDEX,
  INTERACTION_REFERENCE_MD,
  LAYERS_MARKS_MD,
  LINKED_VIEWS_MD,
  MIGRATING_PRE_0_1_MD,
  RENDERING_PERFORMANCE_MD,
  RESPONSIVE_CHARTS_MD,
  SCALES_GUIDES_MD,
  SELECTION_ZOOM_MD,
  SERVER_RENDERING_EXPORT_MD,
  STATISTICS_POSITIONS_MD,
  TEMPORAL_SCALES_MD,
  THEMES_COLOR_MD,
  UPGRADING_MD,
  type InteractionReferenceEntry,
} from "./llms-guide-content";

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

\`normalize()\` stamps \`edition: ${String(CURRENT_EDITION)}\` onto every spec that doesn't carry one,
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

export interface DocsDiscoveryFacts {
  canonicalBase: string;
  packageVersion: string;
  currentEdition: number;
  themeNames: readonly string[];
}

export function docsDiscoveryFacts(canonicalBase: string): DocsDiscoveryFacts {
  return {
    canonicalBase,
    packageVersion: sveltePackage.version,
    currentEdition: CURRENT_EDITION,
    themeNames: THEME_NAMES,
  };
}

export function markdownOutsideFences(markdown: string): string {
  let fenced = false;
  return markdown
    .split("\n")
    .filter((line) => {
      if (line.trimStart().startsWith("```")) {
        fenced = !fenced;
        return false;
      }
      return !fenced;
    })
    .join("\n");
}

function absoluteMarkdownLinks(markdown: string, canonicalBase: string): string {
  const origin = canonicalBase.replace(/\/$/, "");
  let fenced = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (line.trimStart().startsWith("```")) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      return line
        .replaceAll("https://ljodea.github.io/ggsvelte", origin)
        .replaceAll(/\]\((\/[^)\s]*)\)/g, (_match, path: string) => `](${origin}${path})`);
    })
    .join("\n");
}

/** llms.txt — the curated index (llmstxt.org shape: H1, blurb, link lists). */
export function buildLlmsIndex(
  pages: readonly GuidePage[],
  examples: readonly LlmsExampleEntry[],
  facts: DocsDiscoveryFacts = docsDiscoveryFacts("https://ggsvelte.sh"),
): string {
  const lines = [
    "# ggsvelte",
    "",
    "> A layered grammar of graphics for JavaScript: ggplot2 semantics (aes/geom/stat/scale/coord/facet/theme/position), a strictly-JSON PortableSpec that agents emit (published JSON Schema for constrained decoding), a fluent builder, Svelte 5 components, hybrid SVG/canvas rendering, and value-stable color scales. validate() returns { code, path, message, fix } errors whose fix.example is machine-applicable.",
    "",
    "## Current release facts",
    "",
    `- Package version: ${facts.packageVersion}`,
    `- Defaults edition: ${String(facts.currentEdition)}`,
    `- Registered chart themes (${String(facts.themeNames.length)}): ${facts.themeNames.join(", ")}`,
    "",
    "## Docs",
    "",
  ];
  for (const page of pages) {
    lines.push(`- [${page.title}](/guide/${page.slug}): ${page.description}`);
  }
  lines.push(
    "- [PortableSpec playground](/playground): edit bounded local JSON, inspect semantic events, and take complete Svelte, equivalent Builder or JSON, SVG, or an explicit share URL",
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
  return absoluteMarkdownLinks(lines.join("\n"), facts.canonicalBase);
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
  facts: DocsDiscoveryFacts = docsDiscoveryFacts("https://ggsvelte.sh"),
): string {
  const parts = [
    "# ggsvelte — full docs corpus for language models",
    "",
    "Generated from the docs guide sources and the examples manifest (one source, three uses). Each example shows its canonical PortableSpec JSON (what an agent should emit) and the equivalent Svelte component usage.",
    "",
    "## Current release facts",
    "",
    `- Package version: ${facts.packageVersion}`,
    `- Defaults edition: ${String(facts.currentEdition)}`,
    `- Registered chart themes (${String(facts.themeNames.length)}): ${facts.themeNames.join(", ")}`,
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
  return absoluteMarkdownLinks(parts.join("\n"), facts.canonicalBase);
}
