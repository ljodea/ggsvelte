/**
 * gen-llms unit tests: the markdown renderer, the catalog-driven guide
 * sections (coverage against the real catalogs), and the llms.txt /
 * llms-full.txt builders (with the real manifest — zero-manual-upkeep proof:
 * every example the manifest knows appears).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ADVISORY_CATALOG,
  CLI_DIAGNOSTIC_CATALOG,
  PIPELINE_ERROR_CATALOG,
  PIPELINE_WARNING_CATALOG,
} from "@ggsvelte/core";
import { ERROR_CATALOG, LINT_CATALOG } from "@ggsvelte/spec";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../packages/svelte/src/lib/interaction/interaction.ts";

import { EXAMPLES } from "../examples/manifest.ts";
import type { LifecycleDoc } from "./gen-llms.ts";
import { QUICKSTART_PAGE_SVELTE } from "./quickstart.ts";
import {
  buildAdvisoriesMd,
  buildDiagnosticDocs,
  buildErrorsMd,
  buildLifecycleMd,
  buildLlmsFull,
  buildLlmsIndex,
  GETTING_STARTED_MD,
  COMPATIBILITY_MD,
  INTERACTIONS_MD,
  INTERACTION_REFERENCE_MD,
  INTERACTION_REFERENCE_INDEX,
  MIGRATING_PRE_0_1_MD,
  TEMPORAL_SCALES_MD,
  UPGRADING_MD,
  guidePages,
  pruneSpecData,
  renderMarkdown,
} from "./gen-llms.ts";

const lifecycle = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "lifecycle.json"), "utf8"),
) as LifecycleDoc;

describe("renderMarkdown", () => {
  it("renders headings, paragraphs, lists, code, inline code, links", () => {
    const html = renderMarkdown(
      "# T\n\npara with `code` and [x](/y)\n\n- a\n- b\n\n```ts\nconst a = 1 < 2;\n```\n",
    );
    expect(html).toContain('<h1 id="t">T</h1>');
    expect(html).toContain('<p>para with <code>code</code> and <a href="/y">x</a></p>');
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
    expect(html).toContain('<pre><code class="hljs language-ts">');
    expect(html).toContain('hljs-keyword">const</span>');
    expect(html).toContain('hljs-number">1</span>');
    expect(html).toContain("&lt;");
  });

  it("escapes HTML everywhere", () => {
    expect(renderMarkdown("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("prefixes root-relative guide links for project-hosted docs", () => {
    const html = renderMarkdown(
      "[docs](/guide/errors) [external](https://example.com)",
      "/ggsvelte",
    );
    expect(html).toContain('href="/ggsvelte/guide/errors"');
    expect(html).toContain('href="https://example.com"');
  });

  it("renders allowlisted copy fences with accessible icon controls and status", () => {
    const html = renderMarkdown('```json fragment copy\n{"x": 1}\n```');
    expect(html).toContain('<button type="button" data-copy-code="guide-code-1"');
    expect(html).toContain('aria-label="Copy code"');
    expect(html).toContain('aria-describedby="guide-code-1-status"');
    expect(html).toContain("<svg");
    expect(html).not.toContain(">Copy code</button>");
    expect(html).toContain('<pre id="guide-code-1"><code class="hljs language-json">');
    expect(html).toContain("hljs-");
    expect(html).toContain('<span id="guide-code-1-status" role="status" class="visually-hidden">');
    expect(html).toContain('<p class="guide-code-classification">Fragment</p>');
  });

  it("adds stable unique heading fragments", () => {
    const html = renderMarkdown("# Events\n\n## `onselect` event\n\n## `onselect` event");
    expect(html).toContain('<h1 id="events">Events</h1>');
    expect(html).toContain('<h2 id="onselect-event"><code>onselect</code> event</h2>');
    expect(html).toContain('<h2 id="onselect-event-2"><code>onselect</code> event</h2>');
  });
});

describe("guide sections cover their catalogs", () => {
  it("errors page presents every source-qualified diagnostic with stable anchors", () => {
    const entries = buildDiagnosticDocs();
    const expectedCount =
      Object.keys(ERROR_CATALOG).length +
      Object.keys(PIPELINE_ERROR_CATALOG).length +
      Object.keys(PIPELINE_WARNING_CATALOG).length +
      Object.keys(INTERACTION_DIAGNOSTIC_CATALOG).length +
      Object.keys(CLI_DIAGNOSTIC_CATALOG).length;
    expect(entries).toHaveLength(expectedCount);
    expect(new Set(entries.map((entry) => `${entry.source}:${entry.code}`)).size).toBe(
      expectedCount,
    );
    expect(
      entries.find((entry) => entry.source === "validation" && entry.code === "unknown-field"),
    ).toMatchObject({ anchor: "unknown-field", severity: "error", consequence: "blocked" });
    expect(
      entries.find((entry) => entry.source === "pipeline" && entry.code === "unknown-field"),
    ).toMatchObject({
      anchor: "unknown-field-pipeline",
      severity: "error",
      consequence: "blocked",
    });
    expect(
      entries.find((entry) => entry.source === "warning" && entry.code === "palette-exhausted"),
    ).toMatchObject({ anchor: "palette-exhausted-warning", consequence: "degraded" });
    expect(
      entries.find((entry) => entry.source === "cli" && entry.code === "max-marks-exceeded"),
    ).toMatchObject({ anchor: "max-marks-exceeded-cli", consequence: "blocked" });

    const html = renderMarkdown(buildErrorsMd());
    for (const entry of entries) {
      expect(html).toContain(`id="${entry.anchor}"`);
      expect(entry.whatFailed).not.toBe("");
      expect(entry.why).not.toBe("");
      expect(entry.fix).not.toBe("");
    }
    expect(buildErrorsMd()).toContain("## Quickstart troubleshooting");
    expect(buildErrorsMd()).toContain("Minimal illustration — copy only the relevant fragment");
  });

  it("advisories page names every lint + heuristic code", () => {
    const md = buildAdvisoriesMd();
    for (const code of Object.keys(LINT_CATALOG)) expect(md).toContain(`\`${code}\``);
    for (const code of Object.keys(ADVISORY_CATALOG)) expect(md).toContain(`\`${code}\``);
  });

  it("lifecycle page covers every surface and the stable-intent set", () => {
    const md = buildLifecycleMd(lifecycle);
    for (const s of lifecycle.surfaces) expect(md).toContain(s.package);
    expect(md).toContain("`normalize`");
    expect(md).toContain("stable-intent");
    expect(md).toContain("edition: 2");
    expect(md).not.toContain("stamps `edition: 1`");
  });

  it("getting-started leads with the exact complete responsive SvelteKit page", () => {
    expect(GETTING_STARTED_MD).toContain("`src/routes/+page.svelte` (complete file)");
    expect(GETTING_STARTED_MD).toContain(QUICKSTART_PAGE_SVELTE);
    expect(GETTING_STARTED_MD.match(/```svelte complete/g)).toHaveLength(1);
    expect(GETTING_STARTED_MD.match(/```svelte fragment/g)?.length).toBeGreaterThanOrEqual(7);
    expect(QUICKSTART_PAGE_SVELTE).toContain("import { GeomPoint, GGPlot }");
    expect(QUICKSTART_PAGE_SVELTE).toContain("const cars = [");
    expect(QUICKSTART_PAGE_SVELTE).toContain('ariaLabel="Fuel economy decreases');
    expect(QUICKSTART_PAGE_SVELTE).not.toMatch(/\bwidth=/);
    expect(QUICKSTART_PAGE_SVELTE).not.toMatch(/\bheight=/);

    const chartCheckpoint = GETTING_STARTED_MD.indexOf("## You have a chart");
    expect(chartCheckpoint).toBeGreaterThan(-1);
    expect(GETTING_STARTED_MD.indexOf("Fluent builder")).toBeGreaterThan(chartCheckpoint);
    expect(GETTING_STARTED_MD.indexOf("PortableSpec JSON")).toBeGreaterThan(chartCheckpoint);
  });

  it("documents zero-config years, strict temporal overrides, and inspection", () => {
    expect(TEMPORAL_SCALES_MD).toContain('year: "1835"');
    expect(TEMPORAL_SCALES_MD).toContain("without preprocessing");
    expect(TEMPORAL_SCALES_MD).toContain("scaleDecisions");
    expect(TEMPORAL_SCALES_MD).toContain('.scaleXDate({ parse: "dmy" })');
    expect(TEMPORAL_SCALES_MD).toContain("scale_x_discrete()");
  });

  it("documents the machine-checked packed-consumer support contract", () => {
    expect(COMPATIBILITY_MD).toContain("Node.js 22");
    expect(COMPATIBILITY_MD).toContain("Svelte 5.33.1");
    expect(COMPATIBILITY_MD).toContain("npm bundled with Node");
    expect(COMPATIBILITY_MD).toContain("pnpm 11.13.0");
    expect(COMPATIBILITY_MD).toContain("Bun 1.3.14");
    expect(COMPATIBILITY_MD).toContain("packed tarballs");
  });

  it("documents the complete interaction capability and event contracts", () => {
    expect(INTERACTIONS_MD).toContain("private to one chart");
    expect(INTERACTIONS_MD).toContain("createPlotInteraction");
    expect(INTERACTIONS_MD).toContain("stable semantic scope");
    expect(INTERACTIONS_MD).toContain("required, stable semantic scope");
    expect(INTERACTIONS_MD).toContain("Controlled plots never infer channel names");
    expect(INTERACTIONS_MD).toContain("reconcileKeys");
    expect(INTERACTIONS_MD).toContain("without retraining scales");
    expect(INTERACTIONS_MD).toContain("/examples/interactions/inspection");
    expect(INTERACTIONS_MD).toContain("/examples/interaction/linked-views");
    expect(INTERACTIONS_MD).toContain("/playground");
    expect(INTERACTIONS_MD).toContain('inspect={{ mode: "x",');
    expect(INTERACTIONS_MD).toContain('select={{ type: "interval", mode: "xy",');
    expect(INTERACTIONS_MD).toContain('key="id"');
    expect(INTERACTIONS_MD).toContain("oninspect");
    expect(INTERACTIONS_MD).toContain("onselect");
    expect(INTERACTIONS_MD).toContain("oninteraction");
    expect(INTERACTIONS_MD).toContain('phase: "clear"');
    expect(INTERACTIONS_MD).toContain('type: "zoom"');
    expect(INTERACTIONS_MD).toContain("INTERACTION_INTERVAL_FACET_UNSUPPORTED");
  });

  it("publishes a dedicated interaction capability and event reference", () => {
    for (const term of [
      "inspect",
      "point selection",
      "interval selection",
      "zoom",
      "legendfocus",
      "tool",
      "oninspect",
      "onselect",
      "onzoom",
      "onlegendfocus",
      "oninteraction",
      "ondiagnostic",
    ]) {
      expect(INTERACTION_REFERENCE_MD.toLowerCase()).toContain(term);
    }
    expect(INTERACTION_REFERENCE_MD).toContain("INTERACTION_TOOL_UNAVAILABLE");
    expect(INTERACTION_REFERENCE_MD).toContain("chart-local");
    expect(INTERACTION_REFERENCE_MD).toContain("PlotInteractionController");
    expect(INTERACTION_REFERENCE_MD).toContain("required");
    expect(INTERACTION_REFERENCE_MD).toContain("feedback");
    expect(INTERACTION_REFERENCE_MD).toContain("Do not mutate the controller inside");
    const html = renderMarkdown(INTERACTION_REFERENCE_MD);
    for (const diagnostic of Object.values(INTERACTION_DIAGNOSTIC_CATALOG)) {
      const fragment = diagnostic.docUrl.split("#")[1];
      expect(diagnostic.docUrl).toContain("/guide/interaction-reference#");
      expect(html).toContain(`id="${fragment}"`);
    }
  });

  it("exposes an exact searchable interaction index", () => {
    expect(INTERACTION_REFERENCE_INDEX.map((entry) => entry.id)).toEqual([
      "static-default",
      "inspect",
      "point-selection",
      "interval-selection",
      "zoom",
      "legend-focus",
      "legend-filter",
      "controlled-tool",
      "shared-controller",
      "identity",
      "events",
      "diagnostics",
      "accessibility",
    ]);
    for (const entry of INTERACTION_REFERENCE_INDEX) {
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.href).toStartWith("/guide/interaction-reference#");
    }
  });

  it("provides a pre-0.1 source migration for every superseded interaction prop", () => {
    expect(MIGRATING_PRE_0_1_MD).toContain("`tooltip` → `inspect`");
    expect(MIGRATING_PRE_0_1_MD).toContain('`brush` → `select={{ type: "interval" }}`');
    expect(MIGRATING_PRE_0_1_MD).toContain("`onhover` → `oninspect`");
    expect(MIGRATING_PRE_0_1_MD).toContain("`onbrush` → `onselect`");
    expect(MIGRATING_PRE_0_1_MD).toContain("`TooltipContext` → `PlotInspectionChange`");
    expect(MIGRATING_PRE_0_1_MD).toContain("`BrushSelection` → `IntervalSelection`");
  });

  it("provides a rolling upgrading guide with a stable per-transition anchor", () => {
    // One section per release transition; changesets link these anchors, so
    // heading ids must come from the same renderer the docs site uses.
    expect(UPGRADING_MD).toContain("## 0.1 to 0.2");
    expect(renderMarkdown(UPGRADING_MD)).toContain('id="0-1-to-0-2"');
  });

  it("keeps mapped style migration guidance on the release that owns it", () => {
    const styleMigration = UPGRADING_MD.indexOf(
      "### Map style semantics instead of precomputing outputs",
    );
    expect(UPGRADING_MD).toContain("## 0.7 to 0.8");
    expect(renderMarkdown(UPGRADING_MD)).toContain('id="0-7-to-0-8"');
    expect(styleMigration).toBeGreaterThan(UPGRADING_MD.indexOf("## 0.7 to 0.8"));
    expect(styleMigration).toBeLessThan(UPGRADING_MD.indexOf("## 0.6 to 0.7"));
    expect(UPGRADING_MD).toContain("Before 0.8, applications commonly precomputed a point radius");
  });

  it("keeps generic color/fill migration guidance on the release that owns it", () => {
    const colorMigration = UPGRADING_MD.indexOf("### Choose explicit color/fill families");
    expect(UPGRADING_MD).toContain("## 0.6 to 0.7");
    expect(renderMarkdown(UPGRADING_MD)).toContain('id="0-6-to-0-7"');
    expect(colorMigration).toBeGreaterThan(UPGRADING_MD.indexOf("## 0.6 to 0.7"));
    expect(colorMigration).toBeLessThan(UPGRADING_MD.indexOf("## 0.5 to 0.6"));
    expect(UPGRADING_MD).toContain("Before 0.7, an explicit continuous color domain");
  });

  it("states the 0.1→0.2 upgrade contract: additive, controller optional", () => {
    expect(UPGRADING_MD).toContain("No source changes are required");
    // Controller adoption is optional — both APIs remain supported.
    expect(UPGRADING_MD).toContain("createPlotInteraction");
    expect(UPGRADING_MD).toContain("optional");
    // Deprecated aliases predate 0.2 and point at their own migration page.
    expect(UPGRADING_MD).toContain("`BrushSelection` → `IntervalSelection`");
    expect(UPGRADING_MD).toContain("`TooltipContext` → `PlotInspectionChange`");
    expect(UPGRADING_MD).toContain("`ZoomDomains` → `ReadonlyZoomDomains`");
    expect(UPGRADING_MD).toContain("deprecated since 0.1.0");
    expect(UPGRADING_MD).toContain("/guide/migrating-pre-0-1");
  });
});

describe("pruneSpecData", () => {
  it("truncates values rows and column arrays, reporting the pruned count", () => {
    const values = pruneSpecData(
      {
        data: { values: Array.from({ length: 50 }, (_, i) => ({ x: i })) },
        layers: [],
      },
      20,
    );
    expect(values.prunedRows).toBe(30);
    expect((values.spec as { data: { values: unknown[] } }).data.values).toHaveLength(20);
    const columns = pruneSpecData(
      {
        datasets: {
          d: { columns: { x: Array.from({ length: 25 }, (_, i) => i) } },
        },
        layers: [],
      },
      20,
    );
    expect(columns.prunedRows).toBe(5);
  });

  it("leaves small specs byte-identical in structure", () => {
    const spec = { data: { values: [{ x: 1 }] }, layers: [{ geom: "point" }] };
    expect(pruneSpecData(spec, 20).spec).toEqual(spec);
    expect(pruneSpecData(spec, 20).prunedRows).toBe(0);
  });
});

describe("llms surfaces", () => {
  const pages = guidePages(lifecycle);

  it("publishes absolute canonical links and implementation-derived release facts", () => {
    const txt = buildLlmsIndex(pages.slice(0, 1), EXAMPLES.slice(0, 1), {
      canonicalBase: "https://ggsvelte.sh",
      packageVersion: "0.4.0",
      currentEdition: 2,
      themeNames: ["light", "dark"],
    });

    expect(txt).toContain("Package version: 0.4.0");
    expect(txt).toContain("Defaults edition: 2");
    expect(txt).toContain("Registered chart themes (2): light, dark");
    expect(txt).toContain("(https://ggsvelte.sh/guide/getting-started)");
    expect(txt).toContain("(https://ggsvelte.sh/examples/");
    expect(txt).not.toMatch(/\]\(\//);
  });

  it("llms.txt lists every guide page and every manifest example", () => {
    const txt = buildLlmsIndex(pages, EXAMPLES);
    expect(txt.startsWith("# ggsvelte\n")).toBe(true);
    for (const page of pages) expect(txt).toContain(`(https://ggsvelte.sh/guide/${page.slug})`);
    expect(txt).toContain("(https://ggsvelte.sh/schema/v0.json)");
    expect(txt).toContain("(https://ggsvelte.sh/playground)");
    expect(txt).toContain("(https://ggsvelte.sh/reference/interactions)");
    for (const ex of EXAMPLES) expect(txt).toContain(`(https://ggsvelte.sh/examples/${ex.id})`);
    expect(pages.map((page) => page.slug)).toContain("interactions");
    expect(pages.map((page) => page.slug)).toContain("interaction-reference");
    expect(pages.map((page) => page.slug)).toContain("migrating-pre-0-1");
    expect(pages.map((page) => page.slug)).toContain("upgrading");
    expect(pages.map((page) => page.slug)).toContain("compatibility");
  });

  it("keeps first-party interaction examples focused on the current API", () => {
    const inspection = EXAMPLES.find((example) => example.id === "interaction/tooltip");
    const selection = EXAMPLES.find((example) => example.id === "interaction/brush-zoom");
    const linked = EXAMPLES.find((example) => example.id === "interaction/linked-views");
    expect(inspection?.title).toBe("Inspect and pin data");
    expect(inspection?.tags).toContain("inspect");
    expect(inspection?.description).toContain("Chart-local");
    expect(selection?.title).toBe("Interval selection and zoom");
    expect(selection?.tags).toContain("select");
    expect(linked?.title).toBe("Link plots, controls, and a table");
    expect(linked?.tags).toContain("controller");
    expect(linked?.tags).toContain("linked-views");
  });

  it("llms-full.txt carries the same canonical origin and release facts", () => {
    const txt = buildLlmsFull(
      [
        {
          slug: "start",
          title: "Start",
          description: "Start here.",
          markdown:
            '# Start\n\n[Errors](/guide/errors)\n\n[Legacy](https://ljodea.github.io/ggsvelte/guide/errors)\n\n```ts fragment\nconst preserved = "https://ljodea.github.io/ggsvelte/guide/errors";\n```',
        },
      ],
      [],
      {
        canonicalBase: "https://preview.example",
        packageVersion: "0.4.0",
        currentEdition: 2,
        themeNames: ["light", "dark"],
      },
    );

    expect(txt).toContain("Package version: 0.4.0");
    expect(txt).toContain("Defaults edition: 2");
    expect(txt).toContain("Registered chart themes (2): light, dark");
    expect(txt).toContain("[Errors](https://preview.example/guide/errors)");
    expect(txt).toContain("[Legacy](https://preview.example/guide/errors)");
    expect(txt).not.toContain("[Legacy](https://ljodea.github.io/ggsvelte");
    expect(txt).toContain('const preserved = "https://ljodea.github.io/ggsvelte/guide/errors";');
    expect(txt).not.toMatch(/\]\(\//);
  });

  it("llms-full.txt embeds guide prose + spec JSON + svelte source per example", () => {
    const examples = EXAMPLES.slice(0, 2).map((e) => ({
      ...e,
      specJSON: `{\n  "marker": "spec-${e.id}"\n}`,
      svelteSource: `<!-- svelte-${e.id} -->`,
    }));
    const txt = buildLlmsFull(pages, examples);
    for (const page of pages) expect(txt).toContain(page.markdown.trim().split("\n")[0]!);
    for (const ex of examples) {
      expect(txt).toContain(`## ${ex.title} (${ex.id})`);
      expect(txt).toContain(`spec-${ex.id}`);
      expect(txt).toContain(`svelte-${ex.id}`);
    }
  });
});

describe("public export surface (split-safe)", () => {
  it("exposes exactly the documented runtime export set from gen-llms", async () => {
    const mod = await import("./gen-llms.ts");
    const expected = [
      "ACCESSIBILITY_MD",
      "COMPATIBILITY_MD",
      "DATA_MAPPINGS_MD",
      "FACETS_COORDINATES_MD",
      "GETTING_STARTED_MD",
      "INSPECT_PIN_MD",
      "INTERACTIONS_MD",
      "INTERACTION_REFERENCE_INDEX",
      "INTERACTION_REFERENCE_MD",
      "LAYERS_MARKS_MD",
      "LINKED_VIEWS_MD",
      "MIGRATING_PRE_0_1_MD",
      "RENDERING_PERFORMANCE_MD",
      "RESPONSIVE_CHARTS_MD",
      "SCALES_GUIDES_MD",
      "SELECTION_ZOOM_MD",
      "SERVER_RENDERING_EXPORT_MD",
      "STATISTICS_POSITIONS_MD",
      "TEMPORAL_SCALES_MD",
      "THEMES_COLOR_MD",
      "UPGRADING_MD",
      "buildAdvisoriesMd",
      "buildDiagnosticDocs",
      "buildErrorsMd",
      "buildLifecycleMd",
      "buildLlmsFull",
      "buildLlmsIndex",
      "docsDiscoveryFacts",
      "extractMarkdownHeadings",
      "guidePages",
      "markdownOutsideFences",
      "pruneSpecData",
      "renderMarkdown",
    ].toSorted();
    expect(Object.keys(mod).toSorted()).toEqual(expected);
  });
});
