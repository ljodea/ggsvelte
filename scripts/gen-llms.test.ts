/**
 * gen-llms unit tests: the markdown renderer, the catalog-driven guide
 * sections (coverage against the real catalogs), and the llms.txt /
 * llms-full.txt builders (with the real manifest — zero-manual-upkeep proof:
 * every example the manifest knows appears).
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ADVISORY_CATALOG, PIPELINE_ERROR_CATALOG, PIPELINE_WARNING_CATALOG } from "@ggsvelte/core";
import { ERROR_CATALOG, LINT_CATALOG } from "@ggsvelte/spec";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "../packages/svelte/src/lib/interaction/interaction.ts";

import { EXAMPLES } from "../examples/manifest.ts";
import type { LifecycleDoc } from "./gen-llms.ts";
import {
  buildAdvisoriesMd,
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
    expect(html).toContain('<pre><code class="language-ts">const a = 1 &lt; 2;</code></pre>');
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

  it("adds stable unique heading fragments", () => {
    const html = renderMarkdown("# Events\n\n## `onselect` event\n\n## `onselect` event");
    expect(html).toContain('<h1 id="events">Events</h1>');
    expect(html).toContain('<h2 id="onselect-event"><code>onselect</code> event</h2>');
    expect(html).toContain('<h2 id="onselect-event-2"><code>onselect</code> event</h2>');
  });
});

describe("guide sections cover their catalogs", () => {
  it("errors page names every validation + pipeline + warning code", () => {
    const md = buildErrorsMd();
    for (const code of Object.keys(ERROR_CATALOG)) expect(md).toContain(`\`${code}\``);
    for (const code of Object.keys(PIPELINE_ERROR_CATALOG)) expect(md).toContain(`\`${code}\``);
    for (const code of Object.keys(PIPELINE_WARNING_CATALOG)) expect(md).toContain(`\`${code}\``);
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
    expect(md).toContain("edition: 1");
  });

  it("getting-started shows all three surfaces and the fix contract", () => {
    expect(GETTING_STARTED_MD).toContain('geom: "point"');
    expect(GETTING_STARTED_MD).toContain("geomPoint()");
    expect(GETTING_STARTED_MD).toContain("<GeomPoint />");
    expect(GETTING_STARTED_MD).toContain("fix");
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

  it("llms.txt lists every guide page and every manifest example", () => {
    const txt = buildLlmsIndex(pages, EXAMPLES);
    expect(txt.startsWith("# ggsvelte\n")).toBe(true);
    for (const page of pages) expect(txt).toContain(`(/guide/${page.slug})`);
    expect(txt).toContain("(/schema/v0.json)");
    expect(txt).toContain("(/playground)");
    expect(txt).toContain("(/reference/interactions)");
    for (const ex of EXAMPLES) expect(txt).toContain(`(/examples/${ex.id})`);
    expect(pages.map((page) => page.slug)).toContain("interactions");
    expect(pages.map((page) => page.slug)).toContain("interaction-reference");
    expect(pages.map((page) => page.slug)).toContain("migrating-pre-0-1");
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
