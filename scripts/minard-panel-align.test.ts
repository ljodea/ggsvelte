/**
 * path/trajectory stacks two independent GGPlots that share longitude limits.
 * CoordFixed letterboxing + different y-axis chrome used to desync their data
 * panels after the fullWidth container-width upgrade (#1560). The example must
 * keep a post-layout align that pins the cold host to the map panel.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const EXAMPLE = join(ROOT, "examples/path/trajectory/Example.svelte");

describe("path/trajectory shared-longitude panel alignment", () => {
  const source = readFileSync(EXAMPLE, "utf8");

  it("keeps both plots on container width (fullWidth shell)", () => {
    expect(source).toMatch(/width="container"/);
    expect(source).not.toMatch(/\bwidth\s*=\s*\{\s*\d+\s*\}/);
  });

  it("omits the cold y-axis title band (units live in the subtitle)", () => {
    // AXIS_TITLE_BAND (~18px) on the strip alone was enough to shift lon ticks.
    const coldPlot = (source.match(/minard-cold[\s\S]*?<\/GGPlot>/) ?? [])[0] ?? "";
    expect(coldPlot).toMatch(/y=""/);
    expect(coldPlot).not.toMatch(/y="°Réaumur"/);
    expect(coldPlot).toMatch(/degrees Réaumur/);
  });

  it("pins the cold host to the map data panel after layout", () => {
    expect(source).toContain("alignColdPanelToMap");
    expect(source).toContain("ResizeObserver");
    expect(source).toContain("coldWidthPx");
    expect(source).toContain("coldShiftPx");
    expect(source).toContain("frozenColdLeftMargin");
    expect(source).toContain('querySelector(".gg-panel")');
  });

  it("does not observe the cold host for resize (avoids right-edge feedback loop)", () => {
    // ro.observe(cold) re-entered align on every pin write and flickered the strip.
    expect(source).toMatch(/ro\.observe\(map\)/);
    expect(source).not.toMatch(/ro\.observe\(\s*cold\s*\)/);
  });

  it("keeps CoordFixed on the map only", () => {
    const plots = source.match(/<GGPlot[\s\S]*?<\/GGPlot>/g) ?? [];
    expect(plots.length).toBe(2);
    expect(plots[0]).toContain("CoordFixed");
    expect(plots[1]).not.toContain("CoordFixed");
  });
});
