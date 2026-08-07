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

  /**
   * Discrete / categorical interval and distribution examples must not use
   * freescrolling axis-guide modes (`x` / `xy`). Those modes freescroll across
   * category slots and blank x tooltip rows. Hit the mark geometry with
   * `mode="exact"` instead (#1529).
   *
   * Continuous shared-x series (lines, areas, densities) keep `mode="x"`.
   * `crossbar/boxes` is allowlisted: category-center snap makes `x` feel OK.
   */
  const DISCRETE_INTERVAL_EXACT = [
    "boxplot/violin",
    "boxplot/by-category",
    "errorbar/caps",
    "errorbar/mean-se",
    "errorbar/summary-bin",
    "pointrange/midpoints",
    "linerange/stems",
  ] as const;

  for (const id of DISCRETE_INTERVAL_EXACT) {
    it(`${id}: uses mode="exact" (not freescrolling x/xy) on categorical/interval charts`, () => {
      const path = join(EXAMPLES, id, "Example.svelte");
      const source = readFileSync(path, "utf8");
      expect(source).toMatch(/<Inspect\b[^>]*\bmode=["']exact["']/);
      expect(source).not.toMatch(/<Inspect\b[^>]*\bmode=["']x["']/);
      expect(source).not.toMatch(/<Inspect\b[^>]*\bmode=["']xy["']/);
    });
  }

  it("errorbar/mean-se: jitter background points are not hit targets", () => {
    const source = readFileSync(join(EXAMPLES, "errorbar/mean-se/Example.svelte"), "utf8");
    // GeomPoint carries inspect={false}; the summary errorbar remains inspectable.
    expect(source).toMatch(/<GeomPoint[\s\S]*?inspect=\{false\}/);
  });

  it("errorbar/summary-bin: raw scatter is not a hit target", () => {
    const source = readFileSync(join(EXAMPLES, "errorbar/summary-bin/Example.svelte"), "utf8");
    expect(source).toMatch(/<GeomPoint[\s\S]*?inspect=\{false\}/);
  });

  it("path/trajectory: decorative rivers and text labels opt out of inspection", () => {
    const source = readFileSync(join(EXAMPLES, "path/trajectory/Example.svelte"), "utf8");
    // River furniture (campaignRivers) and every GeomText (city/strength/date labels)
    // must set inspect={false}. Troop path + cold path/point stay inspectable.
    const riverBlock = source.match(/<GeomPath[\s\S]*?data=\{campaignRivers\}[\s\S]*?\/>/);
    expect(riverBlock?.[0] ?? "").toContain("inspect={false}");
    const textBlocks = source.match(/<GeomText[\s\S]*?\/>/g) ?? [];
    expect(textBlocks.length).toBeGreaterThanOrEqual(3);
    for (const block of textBlocks) {
      expect(block).toContain("inspect={false}");
    }
  });
});
