/**
 * Gallery examples must teach the v0.20 host interaction API:
 * - inspection via <Inspect>, not GGPlot inspect=
 * - legend focus/filter via <GuideLegend … focus/filter>, not GGPlot props
 *
 * Mark-level inspect={false} (opt-out of hit testing) remains valid.
 */
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { ggplotOpenAttrs, plotLevelInteractionOffenders } from "./ggplot-open-attrs.ts";

const ROOT = join(import.meta.dir, "..");
const EXAMPLES = join(ROOT, "examples");

function walkExampleSvelte(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name.startsWith(".")) return [];
    const path = join(dir, name);
    // Skip broken symlinks (workspace package links in examples/node_modules).
    let st;
    try {
      st = statSync(path);
    } catch {
      return [];
    }
    if (st.isDirectory()) return walkExampleSvelte(path);
    return name === "Example.svelte" ? [path] : [];
  });
}

const files = walkExampleSvelte(EXAMPLES);

/** Charts with no hit targets — Inspect would teach nothing. */
const INSPECT_OPTIONAL = new Set(["blank/axes-only"]);

describe("example interaction API (v0.20)", () => {
  it("finds gallery Example.svelte files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const path of files) {
    const id = relative(EXAMPLES, path);
    it(`${id}: no plot-level inspect / legendFocus / legendFilter`, () => {
      const source = readFileSync(path, "utf8");
      const offenders = ggplotOpenAttrs(source).flatMap((attrs) =>
        plotLevelInteractionOffenders(attrs),
      );
      expect(offenders).toEqual([]);
    });
  }

  for (const path of files) {
    const id = relative(EXAMPLES, path).replace(/\/Example\.svelte$/, "");
    if (INSPECT_OPTIONAL.has(id)) continue;
    it(`${id}: ships <Inspect> so live gallery charts are inspectable`, () => {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("<Inspect");
    });
  }

  it("scans attributes after arrow-function handlers (=> regression)", () => {
    // Devin: /<GGPlot\b([^>]*)>/g stopped at the `>` inside `=>`, so props
    // after handlers were never scanned.
    const source = `
<GGPlot
  data={rows}
  onlegendfilter={(event) => {
    status = event.phase;
  }}
  legendFocus
  legendFilter
  inspect={true}
>
  <GeomPoint />
</GGPlot>
`;
    const attrs = ggplotOpenAttrs(source);
    expect(attrs).toHaveLength(1);
    expect(plotLevelInteractionOffenders(attrs[0]!)).toEqual([
      "legendFocus",
      "legendFilter",
      "inspect",
    ]);
  });

  it("flags bare and braced inspect shorthand", () => {
    expect(plotLevelInteractionOffenders(" data={rows} inspect ")).toEqual(["inspect"]);
    expect(plotLevelInteractionOffenders(" {inspect} ")).toEqual(["inspect"]);
    // Handlers and unrelated identifiers stay clean.
    expect(plotLevelInteractionOffenders(" oninspect={(e) => {}} ")).toEqual([]);
    expect(plotLevelInteractionOffenders(" interactionScope={scope} ")).toEqual([]);
  });

  /**
   * createPlotInteraction / interactionScope are for linked views and shared
   * semantic state — not for single-plot gallery charts that only need legend
   * focus or default row identity. Static examples under every category except
   * `interaction/` must stay free of that boilerplate (default index/`id`
   * identity is enough for GuideLegend focus). README snippets are also gated
   * by scripts/readme-showcase.test.ts; this covers the corpus itself.
   */
  it("keeps createPlotInteraction out of non-interaction gallery examples", () => {
    const offenders = files
      .map((path) => ({
        id: relative(EXAMPLES, path).replace(/\/Example\.svelte$/, ""),
        source: readFileSync(path, "utf8"),
      }))
      .filter(({ id }) => !id.startsWith("interaction/"))
      .filter(
        ({ source }) =>
          source.includes("createPlotInteraction") ||
          source.includes("interactionScope=") ||
          source.includes("{interaction}"),
      )
      .map(({ id }) => id);

    expect(offenders).toEqual([]);
  });
});
