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

import { EXAMPLES } from "../examples/manifest.ts";
import type { LifecycleDoc } from "./gen-llms.ts";
import {
  buildAdvisoriesMd,
  buildErrorsMd,
  buildLifecycleMd,
  buildLlmsFull,
  buildLlmsIndex,
  GETTING_STARTED_MD,
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
    expect(html).toContain("<h1>T</h1>");
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
});

describe("pruneSpecData", () => {
  it("truncates values rows and column arrays, reporting the pruned count", () => {
    const values = pruneSpecData(
      { data: { values: Array.from({ length: 50 }, (_, i) => ({ x: i })) }, layers: [] },
      20,
    );
    expect(values.prunedRows).toBe(30);
    expect((values.spec as { data: { values: unknown[] } }).data.values).toHaveLength(20);
    const columns = pruneSpecData(
      { datasets: { d: { columns: { x: Array.from({ length: 25 }, (_, i) => i) } } }, layers: [] },
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
    for (const ex of EXAMPLES) expect(txt).toContain(`(/examples/${ex.id})`);
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
