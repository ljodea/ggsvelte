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
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walkExampleSvelte(path);
    return name === "Example.svelte" ? [path] : [];
  });
}

const files = walkExampleSvelte(EXAMPLES);

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
      "inspect=",
    ]);
  });
});
